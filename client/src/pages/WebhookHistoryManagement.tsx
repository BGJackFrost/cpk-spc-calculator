import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { RefreshCw, Search, RotateCcw, Trash2, Eye, Download, Clock, CheckCircle, XCircle, AlertTriangle, Send } from "lucide-react";

interface WebhookLog {
  id: string | number;
  webhookId: number;
  webhookName: string;
  destination: string;
  payload: string;
  status: "pending" | "success" | "failed" | "retrying";
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  lastRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function WebhookHistoryManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: historyData, isLoading, refetch } = trpc.webhookHistory.list.useQuery({
    limit: 100,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    search: search || undefined,
  });

  const { data: stats } = trpc.webhookHistory.getStats.useQuery();
  const { data: retryStats } = trpc.webhookHistory.retryStats.useQuery();

  const retryMutation = trpc.webhookHistory.retryOne.useMutation({
    onSuccess: () => {
      toast.success("Đã gửi lại webhook thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const retryAllMutation = trpc.webhookHistory.retryAllFailed.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã retry ${data.retried} webhooks, thành công: ${data.succeeded}, thất bại: ${data.failed}`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.webhookHistory.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa log");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const clearOldMutation = trpc.webhookHistory.clearOld.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.deleted} logs cũ`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Thành công</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Đang chờ</Badge>;
      case "retrying":
        return <Badge className="bg-yellow-500"><RotateCcw className="w-3 h-3 mr-1" />Đang retry</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Lịch sử Webhook</h1>
            <p className="text-muted-foreground">Theo dõi và retry các webhook đã gửi</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline" onClick={() => retryAllMutation.mutate()} disabled={retryAllMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry tất cả thất bại
            </Button>
            <Button variant="outline" onClick={() => clearOldMutation.mutate({ daysOld: 30 })} disabled={clearOldMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa logs cũ (30 ngày)
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <Send className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thành công</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.success || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thất bại</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.failed || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỉ lệ thành công</p>
                  <p className="text-2xl font-bold">{stats?.successRate?.toFixed(1) || 0}%</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retry Stats */}
        {retryStats && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thống kê Retry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng retry</p>
                  <p className="text-xl font-bold">{retryStats.totalRetries}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Retry thành công</p>
                  <p className="text-xl font-bold text-green-600">{retryStats.successfulRetries}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Retry thất bại</p>
                  <p className="text-xl font-bold text-red-600">{retryStats.failedRetries}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">TB retry/delivery</p>
                  <p className="text-xl font-bold">{retryStats.avgRetriesPerDelivery?.toFixed(2) || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử Webhook</CardTitle>
            <CardDescription>Danh sách các webhook đã gửi và trạng thái</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tên webhook, URL..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="success">Thành công</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                  <SelectItem value="pending">Đang chờ</SelectItem>
                  <SelectItem value="retrying">Đang retry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Webhook</TableHead>
                    <TableHead>URL đích</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>HTTP Code</TableHead>
                    <TableHead>Retry</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : !historyData?.logs?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData.logs.map((log: WebhookLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.webhookName}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={log.destination}>
                          {log.destination}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.statusCode || "-"}</TableCell>
                        <TableCell>{log.retryCount}/{log.maxRetries}</TableCell>
                        <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLog(log);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(log.status === "failed" || log.status === "retrying") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => retryMutation.mutate({ id: log.id })}
                                disabled={retryMutation.isPending}
                              >
                                <RotateCcw className="w-4 h-4 text-blue-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Bạn có chắc muốn xóa log này?")) {
                                  deleteMutation.mutate({ id: log.id });
                                }
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết Webhook Log</DialogTitle>
              <DialogDescription>
                ID: {selectedLog?.id} | Webhook: {selectedLog?.webhookName}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <Tabs defaultValue="info">
                <TabsList>
                  <TabsTrigger value="info">Thông tin</TabsTrigger>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Trạng thái</label>
                      <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">HTTP Status</label>
                      <div className="mt-1">{selectedLog.statusCode || "-"}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Thời gian tạo</label>
                      <div className="mt-1">{formatDate(selectedLog.createdAt)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cập nhật lần cuối</label>
                      <div className="mt-1">{formatDate(selectedLog.updatedAt)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Số lần retry</label>
                      <div className="mt-1">{selectedLog.retryCount}/{selectedLog.maxRetries}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Retry tiếp theo</label>
                      <div className="mt-1">{formatDate(selectedLog.nextRetryAt)}</div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">URL đích</label>
                      <div className="mt-1 text-sm break-all">{selectedLog.destination}</div>
                    </div>
                    {selectedLog.errorMessage && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Lỗi</label>
                        <div className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                          {selectedLog.errorMessage}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="payload">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    {selectedLog.payload ? JSON.stringify(JSON.parse(selectedLog.payload), null, 2) : "Không có payload"}
                  </pre>
                </TabsContent>
                <TabsContent value="response">
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                    {selectedLog.responseBody || "Không có response"}
                  </pre>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
