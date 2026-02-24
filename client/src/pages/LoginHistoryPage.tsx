import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import LoadMoreButton from "@/components/LoadMoreButton";
import { 
  LogIn, 
  LogOut, 
  XCircle, 
  Search,
  RefreshCw,
  User,
  Calendar,
  Monitor,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LoginHistoryPage() {
  const [filters, setFilters] = useState({
    username: "",
    eventType: "all",
    authType: "all",
    dateFrom: "",
    dateTo: ""
  });
  
  // Use cursor pagination hook
  const {
    items: loginHistory,
    hasMore,
    isLoading,
    isLoadingMore,
    totalCount,
    loadMore,
    refresh,
  } = useCursorPagination(
    (params) => {
      const query = trpc.localAuth.loginHistoryWithCursor.useQuery({
        cursor: params.cursor,
        limit: params.limit,
        username: filters.username || undefined,
        eventType: filters.eventType !== 'all' ? filters.eventType as any : undefined,
        authType: filters.authType !== 'all' ? filters.authType as any : undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
      });
      return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error as Error | null,
        refetch: query.refetch,
      };
    },
    { pageSize: 50 }
  );
  
  const loginStatsQuery = trpc.localAuth.loginStats.useQuery({});
  
  // Filter locally for additional client-side filtering
  const filteredHistory = useMemo(() => {
    return loginHistory;
  }, [loginHistory]);
  
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "login":
        return <LogIn className="h-4 w-4 text-green-500" />;
      case "logout":
        return <LogOut className="h-4 w-4 text-blue-500" />;
      case "login_failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "login":
        return <Badge className="bg-green-500">Đăng nhập</Badge>;
      case "logout":
        return <Badge className="bg-blue-500">Đăng xuất</Badge>;
      case "login_failed":
        return <Badge variant="destructive">Thất bại</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };
  
  const getAuthTypeBadge = (authType: string) => {
    switch (authType) {
      case "local":
        return <Badge variant="outline">Local</Badge>;
      case "manus":
        return <Badge variant="secondary">Manus</Badge>;
      default:
        return <Badge variant="outline">{authType}</Badge>;
    }
  };
  
  const stats = loginStatsQuery.data;
  
  const clearFilters = useCallback(() => {
    setFilters({
      username: "",
      eventType: "all",
      authType: "all",
      dateFrom: "",
      dateTo: ""
    });
    refresh();
  }, [refresh]);
  
  const [isExporting, setIsExporting] = useState(false);
  
  const exportMutation = trpc.localAuth.exportLoginHistory.useMutation({
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Đã xuất ${data.filename}`);
      setIsExporting(false);
    },
    onError: (error) => {
      toast.error(`Lỗi xuất dữ liệu: ${error.message}`);
      setIsExporting(false);
    },
  });
  
  const handleExport = (format: 'csv' | 'excel') => {
    setIsExporting(true);
    exportMutation.mutate({
      format,
      username: filters.username || undefined,
      eventType: filters.eventType !== 'all' ? filters.eventType as any : undefined,
      authType: filters.authType !== 'all' ? filters.authType as any : undefined,
      startDate: filters.dateFrom || undefined,
      endDate: filters.dateTo || undefined,
    });
  };
  
  // Handle filter changes - refresh data when filters change
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    // Refresh will be triggered by the query when filters change
  }, []);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lịch sử đăng nhập</h1>
            <p className="text-muted-foreground">Theo dõi hoạt động đăng nhập/đăng xuất của người dùng</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Xuất CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Xuất Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              onClick={() => {
                refresh();
                loginStatsQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>
        
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng sự kiện</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <LogOut className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đăng xuất</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.logoutCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đăng nhập thất bại</p>
                    <p className="text-2xl font-bold text-red-600">{stats.loginFailed}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Tên người dùng</Label>
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
              
              <div className="space-y-2">
                <Label>Loại sự kiện</Label>
                <Select 
                  value={filters.eventType} 
                  onValueChange={(v) => handleFilterChange({...filters, eventType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="login">Đăng nhập</SelectItem>
                    <SelectItem value="logout">Đăng xuất</SelectItem>
                    <SelectItem value="login_failed">Thất bại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Loại xác thực</Label>
                <Select 
                  value={filters.authType} 
                  onValueChange={(v) => handleFilterChange({...filters, authType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="manus">Manus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="pl-9"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange({...filters, dateFrom: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date"
                    className="pl-9"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange({...filters, dateTo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Hiển thị {filteredHistory.length} {totalCount ? `/ ${totalCount}` : ''} bản ghi
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách sự kiện</CardTitle>
            <CardDescription>Lịch sử đăng nhập/đăng xuất gần đây</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Sự kiện</TableHead>
                  <TableHead>Loại xác thực</TableHead>
                  <TableHead>Địa chỉ IP</TableHead>
                  <TableHead>Thiết bị</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>{getEventIcon(record.eventType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{record.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getEventBadge(record.eventType)}</TableCell>
                    <TableCell>{getAuthTypeBadge(record.authType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{record.ipAddress || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 max-w-[200px]">
                        <Monitor className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate" title={record.userAgent || ""}>
                          {record.userAgent 
                            ? record.userAgent.substring(0, 30) + (record.userAgent.length > 30 ? "..." : "")
                            : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(record.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredHistory.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không có dữ liệu phù hợp với bộ lọc
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Load More Button */}
            <LoadMoreButton
              hasMore={hasMore}
              isLoading={isLoading || isLoadingMore}
              onLoadMore={loadMore}
              onRefresh={refresh}
              totalCount={totalCount}
              loadedCount={filteredHistory.length}
              showRefresh={false}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
