/**
 * YieldDefectAlertHistory - Dashboard tổng hợp lịch sử cảnh báo
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle, Bell, BellRing, CheckCircle, XCircle, Clock,
  Filter, RefreshCw, Eye, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  acknowledged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  yield_low: "Yield thấp",
  defect_high: "Defect cao",
  spc_violation: "Vi phạm SPC",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động",
  acknowledged: "Đã xác nhận",
  resolved: "Đã giải quyết",
  dismissed: "Đã bỏ qua",
};

export default function YieldDefectAlertHistory() {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [severity, setSeverity] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [alertType, setAlertType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailAlert, setDetailAlert] = useState<any>(null);
  const [resolveNote, setResolveNote] = useState("");
  const { toast } = useToast();

  const utils = trpc.useUtils();

  const { data: listData, isLoading } = trpc.alertHistory.list.useQuery({
    timeRange: timeRange as any,
    severity: severity as any,
    status: status as any,
    alertType: alertType as any,
    page,
    pageSize: 20,
  });

  const { data: statsData } = trpc.alertHistory.stats.useQuery({
    timeRange: timeRange as any,
  });

  const updateStatusMutation = trpc.alertHistory.updateStatus.useMutation({
    onSuccess: () => {
      utils.alertHistory.list.invalidate();
      utils.alertHistory.stats.invalidate();
      toast({ title: "Cập nhật thành công" });
      setDetailAlert(null);
      setResolveNote("");
    },
    onError: (err) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  const bulkUpdateMutation = trpc.alertHistory.bulkUpdateStatus.useMutation({
    onSuccess: (result) => {
      utils.alertHistory.list.invalidate();
      utils.alertHistory.stats.invalidate();
      toast({ title: "Cập nhật thành công", description: `Đã cập nhật ${result.count} alerts` });
      setSelectedIds([]);
    },
    onError: (err) => {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!listData?.alerts) return;
    const allIds = listData.alerts.map((a) => a.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedIds.length === 0) {
      toast({ title: "Chưa chọn alert", description: "Vui lòng chọn ít nhất 1 alert", variant: "destructive" });
      return;
    }
    bulkUpdateMutation.mutate({
      ids: selectedIds,
      status: action as any,
    });
  };

  const formatDate = (ts: number) => new Date(ts).toLocaleString("vi-VN");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BellRing className="h-6 w-6 text-primary" />
              Lịch sử cảnh báo Yield/Defect
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi và quản lý tất cả cảnh báo đã được gửi
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            utils.alertHistory.list.invalidate();
            utils.alertHistory.stats.invalidate();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {statsData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng alerts</p>
                    <p className="text-2xl font-bold">{statsData.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Critical</p>
                    <p className="text-2xl font-bold text-red-600">{statsData.bySeverity?.critical || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                    <p className="text-2xl font-bold text-yellow-600">{statsData.byStatus?.active || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Đã giải quyết</p>
                    <p className="text-2xl font-bold text-green-600">{statsData.byStatus?.resolved || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={timeRange} onValueChange={(v) => { setTimeRange(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Thời gian" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 ngày</SelectItem>
                  <SelectItem value="14d">14 ngày</SelectItem>
                  <SelectItem value="30d">30 ngày</SelectItem>
                  <SelectItem value="90d">90 ngày</SelectItem>
                  <SelectItem value="all">Tất cả</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
                  <SelectItem value="resolved">Đã giải quyết</SelectItem>
                  <SelectItem value="dismissed">Đã bỏ qua</SelectItem>
                </SelectContent>
              </Select>
              <Select value={alertType} onValueChange={(v) => { setAlertType(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Loại alert" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="yield_low">Yield thấp</SelectItem>
                  <SelectItem value="defect_high">Defect cao</SelectItem>
                  <SelectItem value="spc_violation">Vi phạm SPC</SelectItem>
                </SelectContent>
              </Select>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-muted-foreground">{selectedIds.length} đã chọn</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("acknowledged")}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Xác nhận
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("resolved")}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Giải quyết
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction("dismissed")}>
                    <XCircle className="h-3 w-3 mr-1" /> Bỏ qua
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Danh sách cảnh báo</CardTitle>
            <CardDescription>
              {listData ? `${listData.total} cảnh báo | Trang ${listData.page}/${listData.totalPages || 1}` : "Đang tải..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !listData?.alerts?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Không có cảnh báo nào trong khoảng thời gian đã chọn</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left w-8">
                          <Checkbox
                            checked={selectedIds.length === listData.alerts.length && listData.alerts.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="p-2 text-left">Thời gian</th>
                        <th className="p-2 text-left">Loại</th>
                        <th className="p-2 text-left">Severity</th>
                        <th className="p-2 text-left">Tiêu đề</th>
                        <th className="p-2 text-left">Nguồn</th>
                        <th className="p-2 text-left">Trạng thái</th>
                        <th className="p-2 text-left w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listData.alerts.map((alert) => (
                        <tr key={alert.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-2">
                            <Checkbox
                              checked={selectedIds.includes(alert.id)}
                              onCheckedChange={() => toggleSelect(alert.id)}
                            />
                          </td>
                          <td className="p-2 text-xs whitespace-nowrap">{formatDate(alert.createdAt)}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-xs">
                              {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Badge className={`text-xs ${SEVERITY_COLORS[alert.severity] || ""}`}>
                              {alert.severity}
                            </Badge>
                          </td>
                          <td className="p-2 max-w-[200px] truncate">{alert.title}</td>
                          <td className="p-2 text-xs">{alert.sourceName || alert.source || "-"}</td>
                          <td className="p-2">
                            <Badge className={`text-xs ${STATUS_COLORS[alert.status] || ""}`}>
                              {STATUS_LABELS[alert.status] || alert.status}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailAlert(alert)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {listData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Hiển thị {(listData.page - 1) * listData.pageSize + 1}-{Math.min(listData.page * listData.pageSize, listData.total)} / {listData.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">{page} / {listData.totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= listData.totalPages} onClick={() => setPage(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!detailAlert} onOpenChange={() => { setDetailAlert(null); setResolveNote(""); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Chi tiết cảnh báo
              </DialogTitle>
              <DialogDescription>ID: {detailAlert?.id}</DialogDescription>
            </DialogHeader>
            {detailAlert && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Loại</p>
                    <p className="font-medium">{ALERT_TYPE_LABELS[detailAlert.alertType] || detailAlert.alertType}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Severity</p>
                    <Badge className={SEVERITY_COLORS[detailAlert.severity]}>{detailAlert.severity}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trạng thái</p>
                    <Badge className={STATUS_COLORS[detailAlert.status]}>{STATUS_LABELS[detailAlert.status]}</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Thời gian</p>
                    <p className="font-medium">{formatDate(detailAlert.createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tiêu đề</p>
                  <p className="font-medium">{detailAlert.title}</p>
                </div>
                {detailAlert.message && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nội dung</p>
                    <p className="text-sm">{detailAlert.message}</p>
                  </div>
                )}
                {detailAlert.metricValue != null && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Giá trị</p>
                      <p className="font-medium">{detailAlert.metricName}: {detailAlert.metricValue}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ngưỡng</p>
                      <p className="font-medium">{detailAlert.thresholdValue}</p>
                    </div>
                  </div>
                )}
                {detailAlert.sourceName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nguồn</p>
                    <p className="text-sm">{detailAlert.sourceName} ({detailAlert.source})</p>
                  </div>
                )}
                {detailAlert.acknowledgedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Xác nhận bởi</p>
                    <p className="text-sm">{detailAlert.acknowledgedBy} - {detailAlert.acknowledgedAt ? formatDate(detailAlert.acknowledgedAt) : ""}</p>
                  </div>
                )}
                {detailAlert.resolvedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Giải quyết bởi</p>
                    <p className="text-sm">{detailAlert.resolvedBy} - {detailAlert.resolvedAt ? formatDate(detailAlert.resolvedAt) : ""}</p>
                  </div>
                )}
                {detailAlert.resolvedNote && (
                  <div>
                    <p className="text-sm text-muted-foreground">Ghi chú giải quyết</p>
                    <p className="text-sm">{detailAlert.resolvedNote}</p>
                  </div>
                )}
                {detailAlert.status === "active" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Ghi chú (tùy chọn)..."
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {detailAlert?.status === "active" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAlert.id, status: "acknowledged" })}>
                    Xác nhận
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAlert.id, status: "resolved", note: resolveNote })}>
                    Giải quyết
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: detailAlert.id, status: "dismissed" })}>
                    Bỏ qua
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
