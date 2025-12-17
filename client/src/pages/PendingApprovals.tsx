import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  CheckCircle, XCircle, Clock, FileText, Package, Wrench, Calendar,
  AlertTriangle, Filter, RefreshCw, Eye, ChevronLeft, ChevronRight
} from "lucide-react";

interface ApprovalRequest {
  id: number;
  entityType: string;
  entityId: number;
  requesterId: number | string;
  requesterName?: string | number;
  status: string;
  currentStep: number;
  totalSteps: number;
  totalAmount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
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

const statusLabels: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function PendingApprovals() {
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comments, setComments] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Queries
  const { data: requests = [], refetch, isLoading } = trpc.approval.listRequests.useQuery({
    entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Mutations
  const processApprovalMutation = trpc.approval.processApproval.useMutation({
    onSuccess: () => {
      toast.success("Đã xử lý phê duyệt thành công");
      refetch();
      setShowApproveDialog(false);
      setShowRejectDialog(false);
      setComments("");
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Pagination
  const filteredRequests = useMemo(() => {
    return requests;
  }, [requests]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  // Stats
  const stats = useMemo(() => {
    const pending = requests.filter((r: ApprovalRequest) => r.status === "pending").length;
    const approved = requests.filter((r: ApprovalRequest) => r.status === "approved").length;
    const rejected = requests.filter((r: ApprovalRequest) => r.status === "rejected").length;
    return { pending, approved, rejected, total: requests.length };
  }, [requests]);

  const handleApprove = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const handleReject = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedRequest) return;
    processApprovalMutation.mutate({
      entityType: selectedRequest.entityType as "purchase_order" | "stock_export" | "maintenance_request" | "leave_request",
      entityId: selectedRequest.entityId,
      action: "approved",
      comments: comments || undefined,
    });
  };

  const confirmReject = () => {
    if (!selectedRequest) return;
    if (!comments.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    processApprovalMutation.mutate({
      entityType: selectedRequest.entityType as "purchase_order" | "stock_export" | "maintenance_request" | "leave_request",
      entityId: selectedRequest.entityId,
      action: "rejected",
      comments,
    });
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString("vi-VN");
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Phê duyệt</h1>
            <p className="text-muted-foreground">Quản lý các yêu cầu phê duyệt</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Chờ duyệt</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
            </CardHeader>
            <CardContent>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Đã duyệt</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.approved}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Từ chối</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.rejected}</CardTitle>
            </CardHeader>
            <CardContent>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng cộng</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
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
              <div className="w-48">
                <Label>Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="pending">Chờ duyệt</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="rejected">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách yêu cầu</CardTitle>
            <CardDescription>
              Hiển thị {paginatedRequests.length} / {filteredRequests.length} yêu cầu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                Không có yêu cầu nào
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Loại đơn</TableHead>
                      <TableHead>Người yêu cầu</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Tiến độ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request: ApprovalRequest) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">#{request.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entityTypeIcons[request.entityType]}
                            {entityTypeLabels[request.entityType] || request.entityType}
                          </div>
                        </TableCell>
                        <TableCell>{request.requesterName || request.requesterId}</TableCell>
                        <TableCell>{formatCurrency(request.totalAmount)}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            Bước {request.currentStep}/{request.totalSteps}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status]}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => handleApprove(request)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Duyệt
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleReject(request)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Từ chối
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Trang {page} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận phê duyệt</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn phê duyệt yêu cầu #{selectedRequest?.id}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Ghi chú (tùy chọn)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Nhập ghi chú..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={confirmApprove}
                disabled={processApprovalMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Phê duyệt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Từ chối yêu cầu</DialogTitle>
              <DialogDescription>
                Vui lòng nhập lý do từ chối yêu cầu #{selectedRequest?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Lý do từ chối *</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={confirmReject}
                disabled={processApprovalMutation.isPending}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Từ chối
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
