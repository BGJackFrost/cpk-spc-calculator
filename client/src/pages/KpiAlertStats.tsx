import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  BarChart3,
  RefreshCw,
  Eye,
  Check
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const ALERT_TYPE_LABELS: Record<string, string> = {
  cpk_decline: "CPK giảm",
  oee_decline: "OEE giảm",
  cpk_below_warning: "CPK < Warning",
  cpk_below_critical: "CPK < Critical",
  oee_below_warning: "OEE < Warning",
  oee_below_critical: "OEE < Critical",
};

const SEVERITY_COLORS = {
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const CHART_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

export default function KpiAlertStats() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [selectedAlertType, setSelectedAlertType] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.kpiAlertStats.getSummary.useQuery({ days: parseInt(dateRange) });
  const { data: dailyStats, isLoading: dailyLoading } = trpc.kpiAlertStats.getByDay.useQuery({ days: parseInt(dateRange) });
  const { data: weeklyStats, isLoading: weeklyLoading } = trpc.kpiAlertStats.getByWeek.useQuery({ weeks: Math.ceil(parseInt(dateRange) / 7) });
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = trpc.kpiAlertStats.getAlerts.useQuery({
    productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
    alertType: selectedAlertType !== "all" ? selectedAlertType : undefined,
    severity: selectedSeverity !== "all" ? selectedSeverity : undefined,
    limit: 100,
  });
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Mutations
  const exportExcelMutation = trpc.kpiAlertStats.exportExcel.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Xuất Excel thành công!");
    },
    onError: (error) => {
      toast.error(`Lỗi xuất Excel: ${error.message}`);
    },
  });

  const exportPdfMutation = trpc.kpiAlertStats.exportPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Xuất PDF thành công!");
    },
    onError: (error) => {
      toast.error(`Lỗi xuất PDF: ${error.message}`);
    },
  });

  const acknowledgeMutation = trpc.kpiAlertStats.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resolveMutation = trpc.kpiAlertStats.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã giải quyết cảnh báo");
      setResolveDialogOpen(false);
      setResolutionNotes("");
      refetchAlerts();
      refetchSummary();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
    });
  };

  const handleExportPdf = () => {
    exportPdfMutation.mutate({
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
    });
  };

  const handleAcknowledge = (alertId: number) => {
    acknowledgeMutation.mutate({ alertId });
  };

  const handleResolve = () => {
    if (selectedAlertId) {
      resolveMutation.mutate({ alertId: selectedAlertId, resolutionNotes });
    }
  };

  const openResolveDialog = (alertId: number) => {
    setSelectedAlertId(alertId);
    setResolveDialogOpen(true);
  };

  // Prepare chart data
  const pieData = summary?.byType.map((t, i) => ({
    name: ALERT_TYPE_LABELS[t.type] || t.type,
    value: t.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Thống kê Cảnh báo KPI</h1>
            <p className="text-muted-foreground">Theo dõi và quản lý các cảnh báo KPI</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={exportExcelMutation.isPending}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exportExcelMutation.isPending ? "Đang xuất..." : "Excel"}
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={exportPdfMutation.isPending}>
              <FileText className="h-4 w-4 mr-2" />
              {exportPdfMutation.isPending ? "Đang xuất..." : "PDF"}
            </Button>
            <Button variant="outline" onClick={() => { refetchSummary(); refetchAlerts(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <Label>Khoảng thời gian</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dây chuyền</Label>
                <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {productionLines?.map((line: { id: number; name: string }) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loại cảnh báo</Label>
                <Select value={selectedAlertType} onValueChange={setSelectedAlertType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mức độ</Label>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="critical">Nghiêm trọng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng cảnh báo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalAlerts || 0}</div>
              <p className="text-xs text-muted-foreground">Trong {dateRange} ngày qua</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đã xác nhận</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary?.acknowledged || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.totalAlerts ? ((summary.acknowledged / summary.totalAlerts) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đã giải quyết</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary?.resolved || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.totalAlerts ? ((summary.resolved / summary.totalAlerts) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đang chờ xử lý</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="distribution">Phân bổ</TabsTrigger>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Xu hướng cảnh báo theo ngày</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyStats || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="cpkDecline" name="CPK giảm" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="oeeDecline" name="OEE giảm" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="cpkWarning" name="CPK Warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="cpkCritical" name="CPK Critical" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tổng hợp theo tuần</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyStats || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cpkDecline" name="CPK giảm" fill="#3b82f6" />
                        <Bar dataKey="oeeDecline" name="OEE giảm" fill="#ef4444" />
                        <Bar dataKey="cpkWarning" name="CPK Warning" fill="#f59e0b" />
                        <Bar dataKey="cpkCritical" name="CPK Critical" fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phân bổ theo loại cảnh báo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cảnh báo theo dây chuyền</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary?.byLine || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="lineName" type="category" tick={{ fontSize: 12 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" name="Số cảnh báo" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danh sách cảnh báo</CardTitle>
                <CardDescription>
                  Hiển thị {alertsData?.alerts.length || 0} / {alertsData?.total || 0} cảnh báo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Mức độ</TableHead>
                        <TableHead>Giá trị</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertsData?.alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(alert.createdAt).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell>{alert.productionLineName || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS]}>
                              {alert.severity === "warning" ? "Cảnh báo" : "Nghiêm trọng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.currentValue || "-"}
                            {alert.changePercent && (
                              <span className="text-red-500 ml-1">
                                ({alert.changePercent}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {alert.resolvedAt ? (
                              <Badge className="bg-green-100 text-green-800">Đã giải quyết</Badge>
                            ) : alert.acknowledgedAt ? (
                              <Badge className="bg-blue-100 text-blue-800">Đã xác nhận</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">Chờ xử lý</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!alert.acknowledgedAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  disabled={acknowledgeMutation.isPending}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                              {!alert.resolvedAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openResolveDialog(alert.id)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!alertsData?.alerts || alertsData.alerts.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Không có cảnh báo nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Giải quyết cảnh báo</DialogTitle>
              <DialogDescription>
                Nhập ghi chú về cách giải quyết cảnh báo này
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Ghi chú giải quyết</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Mô tả cách đã giải quyết vấn đề..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
                {resolveMutation.isPending ? "Đang xử lý..." : "Xác nhận giải quyết"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
