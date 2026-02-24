import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Filter, 
  Loader2, 
  Search,
  AlertCircle,
  TrendingDown,
  Activity,
  Calendar,
  RefreshCw,
  Eye,
  Check,
  X,
  Download,
  BarChart3,
  Factory
} from "lucide-react";
import { Pagination } from "@/components/Pagination";

interface AlertRecord {
  id: number;
  productionLineId?: number | null;
  machineId?: number | null;
  alertType: string;
  severity: string;
  currentValue?: string | null;
  previousValue?: string | null;
  thresholdValue?: string | null;
  changePercent?: string | null;
  alertMessage?: string | null;
  emailSent: number;
  notificationSent: number;
  acknowledgedBy?: number | null;
  acknowledgedAt?: Date | null;
  resolvedBy?: number | null;
  resolvedAt?: Date | null;
  resolutionNotes?: string | null;
  createdAt: Date;
}

const alertTypeLabels: Record<string, string> = {
  cpk_decline: "CPK Giảm",
  oee_decline: "OEE Giảm",
  cpk_below_warning: "CPK Dưới Ngưỡng Cảnh Báo",
  cpk_below_critical: "CPK Dưới Ngưỡng Nguy Hiểm",
  oee_below_warning: "OEE Dưới Ngưỡng Cảnh Báo",
  oee_below_critical: "OEE Dưới Ngưỡng Nguy Hiểm",
};

const alertTypeIcons: Record<string, React.ReactNode> = {
  cpk_decline: <TrendingDown className="h-4 w-4" />,
  oee_decline: <TrendingDown className="h-4 w-4" />,
  cpk_below_warning: <AlertTriangle className="h-4 w-4" />,
  cpk_below_critical: <AlertCircle className="h-4 w-4" />,
  oee_below_warning: <AlertTriangle className="h-4 w-4" />,
  oee_below_critical: <AlertCircle className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export default function AlertHistory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [alertTypeFilter, setAlertTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  
  // Date range picker state
  const [dateRangeValue, setDateRangeValue] = useState<DateRange | undefined>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { from: startDate, to: endDate };
  });
  
  // Calculate days from date range for stats query
  const dateRangeDays = useMemo(() => {
    if (dateRangeValue?.from && dateRangeValue?.to) {
      return Math.ceil((dateRangeValue.to.getTime() - dateRangeValue.from.getTime()) / (1000 * 60 * 60 * 24)).toString();
    }
    return "30";
  }, [dateRangeValue]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const pageSize = 20;

  // Fetch data
  const { data: alertsData, isLoading, refetch } = trpc.kpiAlertStats.getAlerts.useQuery({
    alertType: alertTypeFilter !== "all" ? alertTypeFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    productionLineId: lineFilter !== "all" ? parseInt(lineFilter) : undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: alertStats } = trpc.kpiAlertStats.getSummary.useQuery({ days: parseInt(dateRangeDays) });

  // Mutations
  const acknowledgeMutation = trpc.kpiAlertStats.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const resolveMutation = trpc.kpiAlertStats.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã giải quyết cảnh báo");
      setResolveDialogOpen(false);
      setSelectedAlert(null);
      setResolutionNotes("");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const alerts = Array.isArray(alertsData) ? alertsData : [];
  const totalCount = alerts.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filter alerts by search term
  const filteredAlerts = useMemo(() => {
    if (!Array.isArray(alerts)) return [];
    if (!searchTerm) return alerts;
    const term = searchTerm.toLowerCase();
    return alerts.filter((alert: AlertRecord) => 
      alert.alertMessage?.toLowerCase().includes(term) ||
      alertTypeLabels[alert.alertType]?.toLowerCase().includes(term)
    );
  }, [alerts, searchTerm]);

  // Filter by status
  const displayAlerts = useMemo(() => {
    if (!Array.isArray(filteredAlerts)) return [];
    if (statusFilter === "all") return filteredAlerts;
    if (statusFilter === "pending") return filteredAlerts.filter((a: AlertRecord) => !a.acknowledgedAt && !a.resolvedAt);
    if (statusFilter === "acknowledged") return filteredAlerts.filter((a: AlertRecord) => a.acknowledgedAt && !a.resolvedAt);
    if (statusFilter === "resolved") return filteredAlerts.filter((a: AlertRecord) => a.resolvedAt);
    return filteredAlerts;
  }, [filteredAlerts, statusFilter]);

  const getLineName = (id: number | null | undefined) => {
    if (!id) return "-";
    return productionLines?.find((l: any) => l.id === id)?.name || "-";
  };

  const getAlertStatus = (alert: AlertRecord) => {
    if (alert.resolvedAt) return { label: "Đã giải quyết", color: "bg-green-100 text-green-700" };
    if (alert.acknowledgedAt) return { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" };
    return { label: "Chờ xử lý", color: "bg-orange-100 text-orange-700" };
  };

  const handleAcknowledge = (alertId: number) => {
    acknowledgeMutation.mutate({ alertId });
  };

  const handleResolve = () => {
    if (!selectedAlert) return;
    resolveMutation.mutate({ 
      alertId: selectedAlert.id, 
      resolutionNotes 
    });
  };

  const openResolveDialog = (alert: AlertRecord) => {
    setSelectedAlert(alert);
    setResolutionNotes(alert.resolutionNotes || "");
    setResolveDialogOpen(true);
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  const formatValue = (value: string | null | undefined) => {
    if (!value) return "-";
    return parseFloat(value).toFixed(4);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Lịch sử Cảnh báo
            </h1>
            <p className="text-muted-foreground mt-1">
              Xem và quản lý tất cả cảnh báo KPI/SPC
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cảnh báo</p>
                  <p className="text-2xl font-bold">{alertStats?.total || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-orange-600">{alertStats?.pending || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã xác nhận</p>
                  <p className="text-2xl font-bold text-blue-600">{alertStats?.acknowledged || 0}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã giải quyết</p>
                  <p className="text-2xl font-bold text-green-600">{alertStats?.resolved || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Tìm kiếm</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Loại cảnh báo</Label>
                <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="cpk_decline">CPK Giảm</SelectItem>
                    <SelectItem value="oee_decline">OEE Giảm</SelectItem>
                    <SelectItem value="cpk_below_warning">CPK Dưới Ngưỡng Cảnh Báo</SelectItem>
                    <SelectItem value="cpk_below_critical">CPK Dưới Ngưỡng Nguy Hiểm</SelectItem>
                    <SelectItem value="oee_below_warning">OEE Dưới Ngưỡng Cảnh Báo</SelectItem>
                    <SelectItem value="oee_below_critical">OEE Dưới Ngưỡng Nguy Hiểm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mức độ</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="critical">Nguy hiểm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="pending">Chờ xử lý</SelectItem>
                    <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
                    <SelectItem value="resolved">Đã giải quyết</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dây chuyền</Label>
                <Select value={lineFilter} onValueChange={setLineFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {productionLines?.map((line: any) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Khoảng thời gian</Label>
                <DateRangePicker
                  dateRange={dateRangeValue}
                  onDateRangeChange={setDateRangeValue}
                  showPresets={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Danh sách cảnh báo
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {totalCount} cảnh báo
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayAlerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có cảnh báo nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                        <th className="px-4 py-3 text-left font-semibold">Loại</th>
                        <th className="px-4 py-3 text-left font-semibold">Mức độ</th>
                        <th className="px-4 py-3 text-left font-semibold">Dây chuyền</th>
                        <th className="px-4 py-3 text-left font-semibold">Giá trị</th>
                        <th className="px-4 py-3 text-left font-semibold">Nội dung</th>
                        <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                        <th className="px-4 py-3 text-center font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayAlerts.map((alert: AlertRecord) => {
                        const status = getAlertStatus(alert);
                        return (
                          <tr key={alert.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDate(alert.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {alertTypeIcons[alert.alertType]}
                                <span className="text-sm">{alertTypeLabels[alert.alertType] || alert.alertType}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={severityColors[alert.severity]}>
                                {alert.severity === "warning" ? "Cảnh báo" : "Nguy hiểm"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Factory className="h-4 w-4 text-muted-foreground" />
                                {getLineName(alert.productionLineId)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div>Hiện tại: <span className="font-medium">{formatValue(alert.currentValue)}</span></div>
                                {alert.thresholdValue && (
                                  <div className="text-muted-foreground">Ngưỡng: {formatValue(alert.thresholdValue)}</div>
                                )}
                                {alert.changePercent && (
                                  <div className={parseFloat(alert.changePercent) < 0 ? "text-red-600" : "text-green-600"}>
                                    {parseFloat(alert.changePercent) > 0 ? "+" : ""}{parseFloat(alert.changePercent).toFixed(2)}%
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm max-w-xs truncate" title={alert.alertMessage || ""}>
                                {alert.alertMessage || "-"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={status.color}>
                                {status.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                {!alert.acknowledgedAt && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleAcknowledge(alert.id)}
                                    disabled={acknowledgeMutation.isPending}
                                    title="Xác nhận"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {!alert.resolvedAt && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => openResolveDialog(alert)}
                                    title="Giải quyết"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Resolve Dialog */}
        <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Giải quyết cảnh báo</DialogTitle>
              <DialogDescription>
                Nhập ghi chú về cách giải quyết cảnh báo này
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedAlert && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    {alertTypeIcons[selectedAlert.alertType]}
                    <span className="font-medium">{alertTypeLabels[selectedAlert.alertType]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedAlert.alertMessage}</p>
                  <div className="text-sm">
                    Giá trị: <span className="font-medium">{formatValue(selectedAlert.currentValue)}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Ghi chú giải quyết</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Mô tả cách bạn đã giải quyết vấn đề này..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleResolve} disabled={resolveMutation.isPending}>
                {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Xác nhận giải quyết
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
