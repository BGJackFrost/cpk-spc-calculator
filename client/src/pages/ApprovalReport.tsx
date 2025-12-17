import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, Clock, CheckCircle, XCircle, TrendingUp, Users,
  Calendar, FileText, Package, Wrench, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  avgProcessingTime: number; // in hours
  byEntityType: Record<string, { total: number; approved: number; rejected: number }>;
  byMonth: { month: string; approved: number; rejected: number; pending: number }[];
  topApprovers: { name: string; count: number }[];
}

const entityTypeLabels: Record<string, string> = {
  purchase_order: "Đơn đặt hàng",
  stock_export: "Xuất kho",
  maintenance_request: "Yêu cầu bảo trì",
  leave_request: "Đơn nghỉ phép",
};

const entityTypeIcons: Record<string, React.ReactNode> = {
  purchase_order: <Package className="h-4 w-4" />,
  stock_export: <FileText className="h-4 w-4" />,
  maintenance_request: <Wrench className="h-4 w-4" />,
  leave_request: <Calendar className="h-4 w-4" />,
};

export default function ApprovalReport() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  // Query all requests
  const { data: requests = [], refetch, isLoading } = trpc.approval.listRequests.useQuery({
    entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
  });

  // Calculate stats
  const stats = useMemo<ApprovalStats>(() => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filter by time range
    const filteredRequests = requests.filter((r: any) => {
      const createdAt = new Date(r.createdAt);
      return createdAt >= cutoffDate;
    });

    const total = filteredRequests.length;
    const pending = filteredRequests.filter((r: any) => r.status === "pending").length;
    const approved = filteredRequests.filter((r: any) => r.status === "approved").length;
    const rejected = filteredRequests.filter((r: any) => r.status === "rejected").length;

    // Calculate average processing time (for approved/rejected)
    let totalProcessingTime = 0;
    let processedCount = 0;
    filteredRequests.forEach((r: any) => {
      if (r.status === "approved" || r.status === "rejected") {
        const created = new Date(r.createdAt).getTime();
        const updated = new Date(r.updatedAt).getTime();
        totalProcessingTime += (updated - created) / (1000 * 60 * 60); // hours
        processedCount++;
      }
    });
    const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

    // By entity type
    const byEntityType: Record<string, { total: number; approved: number; rejected: number }> = {};
    filteredRequests.forEach((r: any) => {
      if (!byEntityType[r.entityType]) {
        byEntityType[r.entityType] = { total: 0, approved: 0, rejected: 0 };
      }
      byEntityType[r.entityType].total++;
      if (r.status === "approved") byEntityType[r.entityType].approved++;
      if (r.status === "rejected") byEntityType[r.entityType].rejected++;
    });

    // By month (last 6 months)
    const byMonth: { month: string; approved: number; rejected: number; pending: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
      
      const monthRequests = requests.filter((r: any) => {
        const created = new Date(r.createdAt);
        return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
      });

      byMonth.push({
        month: monthLabel,
        approved: monthRequests.filter((r: any) => r.status === "approved").length,
        rejected: monthRequests.filter((r: any) => r.status === "rejected").length,
        pending: monthRequests.filter((r: any) => r.status === "pending").length,
      });
    }

    // Top approvers (placeholder - would need approval history)
    const topApprovers: { name: string; count: number }[] = [];

    return {
      total,
      pending,
      approved,
      rejected,
      avgProcessingTime,
      byEntityType,
      byMonth,
      topApprovers,
    };
  }, [requests, timeRange]);

  const approvalRate = stats.total > 0 
    ? ((stats.approved / (stats.approved + stats.rejected)) * 100).toFixed(1) 
    : "0";

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Báo cáo Phê duyệt
            </h1>
            <p className="text-muted-foreground">Thống kê phê duyệt theo thời gian và loại đơn</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Label>Khoảng thời gian</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày qua</SelectItem>
                    <SelectItem value="30">30 ngày qua</SelectItem>
                    <SelectItem value="90">90 ngày qua</SelectItem>
                    <SelectItem value="365">1 năm qua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label>Loại đơn</Label>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="purchase_order">Đơn đặt hàng</SelectItem>
                    <SelectItem value="stock_export">Xuất kho</SelectItem>
                    <SelectItem value="maintenance_request">Yêu cầu bảo trì</SelectItem>
                    <SelectItem value="leave_request">Đơn nghỉ phép</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng số đơn</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Chờ duyệt</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
            </CardHeader>
            <CardContent>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Đã duyệt</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Từ chối</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
            </CardHeader>
            <CardContent>
              <XCircle className="h-5 w-5 text-red-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tỷ lệ duyệt</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{approvalRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </CardContent>
          </Card>
        </div>

        {/* Processing Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Thời gian xử lý trung bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {stats.avgProcessingTime.toFixed(1)} giờ
            </div>
            <p className="text-muted-foreground mt-2">
              Tính từ lúc tạo đơn đến khi được phê duyệt/từ chối
            </p>
          </CardContent>
        </Card>

        {/* By Entity Type */}
        <Card>
          <CardHeader>
            <CardTitle>Thống kê theo loại đơn</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại đơn</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead className="text-right">Đã duyệt</TableHead>
                    <TableHead className="text-right">Từ chối</TableHead>
                    <TableHead className="text-right">Tỷ lệ duyệt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(stats.byEntityType).map(([type, data]) => {
                    const rate = data.approved + data.rejected > 0
                      ? ((data.approved / (data.approved + data.rejected)) * 100).toFixed(1)
                      : "0";
                    return (
                      <TableRow key={type}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entityTypeIcons[type]}
                            {entityTypeLabels[type] || type}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{data.total}</TableCell>
                        <TableCell className="text-right text-green-600">{data.approved}</TableCell>
                        <TableCell className="text-right text-red-600">{data.rejected}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(rate) >= 80 ? "default" : "secondary"}>
                            {rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {Object.keys(stats.byEntityType).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Xu hướng theo tháng (6 tháng gần nhất)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tháng</TableHead>
                  <TableHead className="text-right">Chờ duyệt</TableHead>
                  <TableHead className="text-right">Đã duyệt</TableHead>
                  <TableHead className="text-right">Từ chối</TableHead>
                  <TableHead className="text-right">Tổng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byMonth.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell className="text-right text-yellow-600">{month.pending}</TableCell>
                    <TableCell className="text-right text-green-600">{month.approved}</TableCell>
                    <TableCell className="text-right text-red-600">{month.rejected}</TableCell>
                    <TableCell className="text-right font-medium">
                      {month.pending + month.approved + month.rejected}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Approvers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top người phê duyệt
            </CardTitle>
            <CardDescription>
              Danh sách người phê duyệt nhiều nhất (cần tích hợp approval history)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Tính năng đang phát triển - cần tích hợp với approval_histories
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
