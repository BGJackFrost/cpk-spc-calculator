import { useState, useEffect, useMemo } from "react";
import { 
  Bell, AlertTriangle, CheckCircle2, TrendingDown, X, Trash2, 
  FileText, Activity, Info, AlertCircle, Search, Filter, 
  Calendar, ChevronDown, Check, Clock, Download, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export interface Notification {
  id: string;
  type: "cpk_warning" | "cpk_critical" | "spc_violation" | "plan_status" | "info" | "oee_alert" | "machine_status" | "spc_rule_violation" | "report_sent" | "cpk_alert" | "system" | "anomaly_detected" | "ntf_pattern_detected" | "ntf_suggestion_new";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity?: "info" | "warning" | "critical";
  data?: {
    cpk?: number;
    threshold?: number;
    productCode?: string;
    stationName?: string;
    planName?: string;
    oee?: number;
    machineName?: string;
    machineStatus?: string;
    rule?: string;
    [key: string]: unknown;
  };
}

// Global notification store
let notifications: Notification[] = [];
let listeners: ((n: Notification[]) => void)[] = [];

export function addNotification(notification: Omit<Notification, "id" | "timestamp" | "read">) {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date(),
    read: false,
  };
  notifications = [newNotification, ...notifications].slice(0, 50);
  listeners.forEach(l => l([...notifications]));
}

export function markAsRead(id: string) {
  notifications = notifications.map(n => 
    n.id === id ? { ...n, read: true } : n
  );
  listeners.forEach(l => l([...notifications]));
}

export function markAllAsRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  listeners.forEach(l => l([...notifications]));
}

export function clearAllNotifications() {
  notifications = [];
  listeners.forEach(l => l([...notifications]));
}

export function useNotifications() {
  const [state, setState] = useState<Notification[]>(notifications);
  
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);
  
  return {
    notifications: state,
    unreadCount: state.filter(n => !n.read).length,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  };
}

// Type filter options
const typeOptions = [
  { value: 'report_sent', label: 'Báo cáo', icon: FileText },
  { value: 'spc_violation', label: 'Vi phạm SPC', icon: AlertTriangle },
  { value: 'cpk_alert', label: 'Cảnh báo CPK', icon: TrendingDown },
  { value: 'system', label: 'Hệ thống', icon: Info },
  { value: 'anomaly_detected', label: 'Bất thường', icon: AlertCircle },
  { value: 'ntf_pattern_detected', label: 'NTF Pattern', icon: Activity },
  { value: 'ntf_suggestion_new', label: 'NTF Đề xuất', icon: CheckCircle2 },
] as const;

// Time filter options
const timeOptions = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
] as const;

// Severity filter options
const severityOptions = [
  { value: 'info', label: 'Thông tin', color: 'bg-blue-500' },
  { value: 'warning', label: 'Cảnh báo', color: 'bg-yellow-500' },
  { value: 'critical', label: 'Nghiêm trọng', color: 'bg-red-500' },
] as const;

export function NotificationBell() {
  const { notifications: localNotifications, unreadCount: localUnreadCount, markAsRead: localMarkAsRead, markAllAsRead: localMarkAllAsRead, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string | undefined>(undefined);
  const utils = trpc.useUtils();

  // Build filter params
  const filterParams = useMemo(() => ({
    limit: 50,
    unreadOnly: activeTab === "unread",
    types: selectedTypes.length > 0 ? selectedTypes as any : undefined,
    severities: selectedSeverities.length > 0 ? selectedSeverities as any : undefined,
    timeRange: selectedTimeRange as any,
    search: searchQuery || undefined,
  }), [activeTab, selectedTypes, selectedSeverities, selectedTimeRange, searchQuery]);

  // Fetch notifications from API with filters
  const { data: apiNotifications = [], isLoading } = trpc.userNotification.list.useQuery(
    filterParams,
    { enabled: open, refetchInterval: 30000 }
  );

  // Fetch unread count from API
  const { data: unreadData } = trpc.userNotification.getUnreadCount.useQuery(undefined, {
    refetchInterval: 15000,
  });

  // Fetch stats
  const { data: stats } = trpc.userNotification.getStats.useQuery(
    { timeRange: 'all' },
    { enabled: open }
  );

  // Mutations
  const markAsReadMutation = trpc.userNotification.markAsRead.useMutation({
    onSuccess: () => {
      utils.userNotification.list.invalidate();
      utils.userNotification.getUnreadCount.invalidate();
      utils.userNotification.getStats.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.userNotification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.userNotification.list.invalidate();
      utils.userNotification.getUnreadCount.invalidate();
      utils.userNotification.getStats.invalidate();
    },
  });

  const deleteAllReadMutation = trpc.userNotification.deleteAllRead.useMutation({
    onSuccess: () => {
      utils.userNotification.list.invalidate();
      utils.userNotification.getUnreadCount.invalidate();
      utils.userNotification.getStats.invalidate();
    },
  });

  // Combine local and API notifications
  const combinedNotifications = useMemo(() => {
    const apiMapped = apiNotifications.map((n: any) => ({
      id: `api-${n.id}`,
      type: n.type as Notification['type'],
      title: n.title,
      message: n.message,
      timestamp: new Date(n.createdAt),
      read: n.isRead === 1,
      severity: n.severity,
      data: n.metadata ? (typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata) : undefined,
      apiId: n.id,
    }));

    // Filter local notifications based on search and filters
    let filtered = localNotifications;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }
    
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(n => selectedTypes.includes(n.type));
    }
    
    if (activeTab === "unread") {
      filtered = filtered.filter(n => !n.read);
    }

    return [...filtered, ...apiMapped]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }, [localNotifications, apiNotifications, searchQuery, selectedTypes, activeTab]);

  const totalUnreadCount = localUnreadCount + (unreadData?.count || 0);

  const handleMarkAsRead = (notification: any) => {
    if (notification.apiId) {
      markAsReadMutation.mutate({ notificationId: notification.apiId });
    } else {
      localMarkAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    localMarkAllAsRead();
    markAllAsReadMutation.mutate();
  };

  const handleDeleteAllRead = () => {
    clearAllNotifications();
    deleteAllReadMutation.mutate();
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleSeverity = (severity: string) => {
    setSelectedSeverities(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedSeverities([]);
    setSelectedTimeRange(undefined);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedSeverities.length > 0 || selectedTimeRange || searchQuery;

  const getIcon = (type: Notification["type"] | string) => {
    switch (type) {
      case "cpk_critical":
      case "cpk_alert":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "cpk_warning":
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case "spc_violation":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "plan_status":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "report_sent":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "anomaly_detected":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "system":
        return <Info className="h-4 w-4 text-gray-500" />;
      case "ntf_pattern_detected":
        return <Activity className="h-4 w-4 text-purple-500" />;
      case "ntf_suggestion_new":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBgColor = (type: Notification["type"], read: boolean, severity?: string) => {
    if (read) return "bg-muted/30";
    if (severity === "critical") return "bg-red-50 dark:bg-red-950/30";
    if (severity === "warning") return "bg-yellow-50 dark:bg-yellow-950/30";
    switch (type) {
      case "cpk_critical":
        return "bg-red-50 dark:bg-red-950/30";
      case "cpk_warning":
        return "bg-yellow-50 dark:bg-yellow-950/30";
      case "spc_violation":
        return "bg-orange-50 dark:bg-orange-950/30";
      case "ntf_pattern_detected":
        return "bg-purple-50 dark:bg-purple-950/30";
      case "ntf_suggestion_new":
        return "bg-green-50 dark:bg-green-950/30";
      default:
        return "bg-blue-50 dark:bg-blue-950/30";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  // Export handlers
  const handleExportCsv = async () => {
    try {
      const response = await fetch(`/api/trpc/userNotification.exportCsv?input=${encodeURIComponent(JSON.stringify({
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
        timeRange: selectedTimeRange,
      }))}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.result?.data) {
        const { csv, filename } = result.result.data;
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Đã xuất ${result.result.data.count} thông báo ra CSV`);
      }
    } catch (error) {
      toast.error('Lỗi khi xuất CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/trpc/userNotification.exportExcel?input=${encodeURIComponent(JSON.stringify({
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
        timeRange: selectedTimeRange,
      }))}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.result?.data) {
        const { data, filename } = result.result.data;
        // Use xlsx library for Excel export
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(data.map((row: any) => ({
          'ID': row.id,
          'Loại': row.type,
          'Mức độ': row.severity,
          'Tiêu đề': row.title,
          'Nội dung': row.message,
          'Trạng thái': row.status,
          'Thời gian tạo': row.createdAt,
          'Thời gian đọc': row.readAt || '',
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Thông báo');
        XLSX.writeFile(wb, filename);
        toast.success(`Đã xuất ${result.result.data.count} thông báo ra Excel`);
      }
    } catch (error) {
      toast.error('Lỗi khi xuất Excel');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <Badge 
                variant="destructive" 
                className="relative h-5 min-w-5 flex items-center justify-center p-0 px-1 text-[10px] font-bold rounded-full shadow-lg"
              >
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Thông báo</h4>
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {totalUnreadCount} chưa đọc
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Xuất lịch sử</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCsv}>
                  <FileText className="h-4 w-4 mr-2" />
                  Xuất CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Xuất Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {totalUnreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-8 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Đã đọc tất cả
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteAllRead}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="px-4 py-2 border-b space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  Loại
                  {selectedTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Loại thông báo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {typeOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selectedTypes.includes(option.value)}
                    onCheckedChange={() => toggleType(option.value)}
                  >
                    <option.icon className="h-4 w-4 mr-2" />
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Severity Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Mức độ
                  {selectedSeverities.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedSeverities.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuLabel>Mức độ</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {severityOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selectedSeverities.includes(option.value)}
                    onCheckedChange={() => toggleSeverity(option.value)}
                  >
                    <div className={cn("h-2 w-2 rounded-full mr-2", option.color)} />
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Time Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedTimeRange 
                    ? timeOptions.find(t => t.value === selectedTimeRange)?.label 
                    : "Thời gian"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuLabel>Khoảng thời gian</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!selectedTimeRange}
                  onCheckedChange={() => setSelectedTimeRange(undefined)}
                >
                  Tất cả
                </DropdownMenuCheckboxItem>
                {timeOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selectedTimeRange === option.value}
                    onCheckedChange={() => setSelectedTimeRange(
                      selectedTimeRange === option.value ? undefined : option.value
                    )}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="all" className="text-xs">
                Tất cả
                {stats?.total ? (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {stats.total}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Chưa đọc
                {stats?.unread ? (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                    {stats.unread}
                  </Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            <NotificationList 
              notifications={combinedNotifications}
              isLoading={isLoading}
              onMarkAsRead={handleMarkAsRead}
              getIcon={getIcon}
              getBgColor={getBgColor}
              formatTime={formatTime}
            />
          </TabsContent>
          <TabsContent value="unread" className="m-0">
            <NotificationList 
              notifications={combinedNotifications}
              isLoading={isLoading}
              onMarkAsRead={handleMarkAsRead}
              getIcon={getIcon}
              getBgColor={getBgColor}
              formatTime={formatTime}
            />
          </TabsContent>
        </Tabs>

        {/* Stats Footer */}
        {stats && (
          <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>
                {stats.bySeverity?.critical ? (
                  <span className="text-red-500 font-medium">{stats.bySeverity.critical} nghiêm trọng</span>
                ) : null}
                {stats.bySeverity?.critical && stats.bySeverity?.warning ? " · " : null}
                {stats.bySeverity?.warning ? (
                  <span className="text-yellow-500 font-medium">{stats.bySeverity.warning} cảnh báo</span>
                ) : null}
              </span>
              <span>{stats.total} thông báo</span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Notification List Component
function NotificationList({ 
  notifications, 
  isLoading, 
  onMarkAsRead, 
  getIcon, 
  getBgColor, 
  formatTime 
}: {
  notifications: any[];
  isLoading: boolean;
  onMarkAsRead: (n: any) => void;
  getIcon: (type: string) => React.ReactNode;
  getBgColor: (type: any, read: boolean, severity?: string) => string;
  formatTime: (date: Date) => string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bell className="h-12 w-12 mb-4 opacity-20" />
        <p>Không có thông báo</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px]">
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
              getBgColor(notification.type, notification.read, notification.severity)
            )}
            onClick={() => onMarkAsRead(notification)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    !notification.read && "font-semibold"
                  )}>
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-1">
                    {notification.severity && (
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        notification.severity === "critical" ? "bg-red-500" :
                        notification.severity === "warning" ? "bg-yellow-500" : "bg-blue-500"
                      )} />
                    )}
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
                {notification.data?.cpk !== undefined && (
                  <p className="text-xs mt-1">
                    CPK: <span className={cn(
                      "font-medium",
                      notification.type === "cpk_critical" || notification.severity === "critical" ? "text-red-600" :
                      notification.type === "cpk_warning" || notification.severity === "warning" ? "text-yellow-600" : "text-green-600"
                    )}>
                      {notification.data.cpk.toFixed(3)}
                    </span>
                    {notification.data.threshold && (
                      <span className="text-muted-foreground">
                        {" "}(Ngưỡng: {notification.data.threshold.toFixed(2)})
                      </span>
                    )}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(notification.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default NotificationBell;
