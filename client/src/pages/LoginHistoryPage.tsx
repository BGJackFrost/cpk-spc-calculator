import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
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
  AlertTriangle
} from "lucide-react";

export default function LoginHistoryPage() {
  const [filters, setFilters] = useState({
    username: "",
    eventType: "all",
    authType: "all",
    dateFrom: "",
    dateTo: ""
  });
  
  const loginHistoryQuery = trpc.localAuth.loginHistory.useQuery({ pageSize: 500 });
  const loginStatsQuery = trpc.localAuth.loginStats.useQuery({});
  
  const filteredHistory = useMemo(() => {
    if (!loginHistoryQuery.data?.logs) return [];
    
    return loginHistoryQuery.data.logs.filter((record: any) => {
      // Filter by username
      if (filters.username && !record.username.toLowerCase().includes(filters.username.toLowerCase())) {
        return false;
      }
      
      // Filter by event type
      if (filters.eventType !== "all" && record.eventType !== filters.eventType) {
        return false;
      }
      
      // Filter by auth type
      if (filters.authType !== "all" && record.authType !== filters.authType) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (new Date(record.createdAt) < fromDate) return false;
      }
      
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (new Date(record.createdAt) > toDate) return false;
      }
      
      return true;
    });
  }, [loginHistoryQuery.data, filters]);
  
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
  
  const clearFilters = () => {
    setFilters({
      username: "",
      eventType: "all",
      authType: "all",
      dateFrom: "",
      dateTo: ""
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lịch sử đăng nhập</h1>
            <p className="text-muted-foreground">Theo dõi hoạt động đăng nhập/đăng xuất của người dùng</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              loginHistoryQuery.refetch();
              loginStatsQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
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
                    onChange={(e) => setFilters({...filters, username: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Loại sự kiện</Label>
                <Select 
                  value={filters.eventType} 
                  onValueChange={(v) => setFilters({...filters, eventType: v})}
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
                  onValueChange={(v) => setFilters({...filters, authType: v})}
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
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
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
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Hiển thị {filteredHistory.length} / {loginHistoryQuery.data?.total || 0} bản ghi
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
                {filteredHistory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {loginHistoryQuery.isLoading 
                        ? "Đang tải..." 
                        : "Không có dữ liệu phù hợp với bộ lọc"}
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
