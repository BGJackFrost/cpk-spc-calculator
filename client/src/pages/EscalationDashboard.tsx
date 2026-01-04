import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Search,
  Filter,
  Eye,
  Check,
  X
} from "lucide-react";

const severityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  active: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  acknowledged: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  auto_resolved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function EscalationDashboard() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ type: "acknowledge" | "resolve"; id: number } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  const { data: escalations, isLoading, refetch } = trpc.escalationHistory.getList.useQuery({
    page,
    pageSize: 20,
    status: statusFilter as any || undefined,
    severity: severityFilter as any || undefined,
    startDate: thirtyDaysAgo,
    endDate: now,
  });
  
  const { data: stats } = trpc.escalationHistory.getStats.useQuery({
    startDate: thirtyDaysAgo,
    endDate: now,
  });
  
  const { data: mttr } = trpc.escalationHistory.getMttr.useQuery({
    startDate: thirtyDaysAgo,
    endDate: now,
  });
  
  const acknowledgeMutation = trpc.escalationHistory.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận escalation");
      refetch();
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const resolveMutation = trpc.escalationHistory.resolve.useMutation({
    onSuccess: () => {
      toast.success("Đã giải quyết escalation");
      refetch();
      setActionDialog(null);
      setActionNotes("");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const handleAction = () => {
    if (!actionDialog) return;
    
    if (actionDialog.type === "acknowledge") {
      acknowledgeMutation.mutate({ id: actionDialog.id, notes: actionNotes || undefined });
    } else {
      resolveMutation.mutate({ id: actionDialog.id, notes: actionNotes || undefined });
    }
  };
  
  const filteredEscalations = useMemo(() => {
    if (!escalations?.items) return [];
    if (!searchQuery) return escalations.items;
    
    const query = searchQuery.toLowerCase();
    return escalations.items.filter(item => 
      item.alertTitle.toLowerCase().includes(query) ||
      item.alertType.toLowerCase().includes(query) ||
      item.alertMessage?.toLowerCase().includes(query)
    );
  }, [escalations?.items, searchQuery]);
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Escalation Dashboard</h1>
          <p className="text-muted-foreground">Theo dõi và quản lý lịch sử escalation</p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cộng</p>
                  <p className="text-2xl font-bold">{stats?.totals.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold">{stats?.totals.active || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Eye className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã xác nhận</p>
                  <p className="text-2xl font-bold">{stats?.totals.acknowledged || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã giải quyết</p>
                  <p className="text-2xl font-bold">{stats?.totals.resolved || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MTTR (phút)</p>
                  <p className="text-2xl font-bold">{mttr?.overall.avgMttrMinutes || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Phân bố trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[item.status]}>
                        {item.status === "active" ? "Đang hoạt động" :
                         item.status === "acknowledged" ? "Đã xác nhận" :
                         item.status === "resolved" ? "Đã giải quyết" : "Tự động giải quyết"}
                      </Badge>
                    </div>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Phân bố mức độ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.severityDistribution.map((item) => (
                  <div key={item.severity} className="flex items-center justify-between">
                    <Badge className={severityColors[item.severity]}>
                      {item.severity === "low" ? "Thấp" :
                       item.severity === "medium" ? "Trung bình" :
                       item.severity === "high" ? "Cao" : "Nghiêm trọng"}
                    </Badge>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* MTTR by Severity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                MTTR theo mức độ
              </CardTitle>
              <CardDescription>Thời gian giải quyết trung bình (phút)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mttr?.bySeverity.map((item) => (
                  <div key={item.severity} className="flex items-center justify-between">
                    <Badge className={severityColors[item.severity]}>
                      {item.severity === "low" ? "Thấp" :
                       item.severity === "medium" ? "Trung bình" :
                       item.severity === "high" ? "Cao" : "Nghiêm trọng"}
                    </Badge>
                    <span className="font-semibold">{item.avgMttrMinutes} phút</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Escalation List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Danh sách Escalation</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="acknowledged">Đã xác nhận</SelectItem>
                    <SelectItem value="resolved">Đã giải quyết</SelectItem>
                    <SelectItem value="auto_resolved">Tự động giải quyết</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="low">Thấp</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="critical">Nghiêm trọng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Tiêu đề</th>
                    <th className="text-left py-3 px-2 font-medium">Loại</th>
                    <th className="text-left py-3 px-2 font-medium">Mức độ</th>
                    <th className="text-left py-3 px-2 font-medium">Trạng thái</th>
                    <th className="text-left py-3 px-2 font-medium">Level</th>
                    <th className="text-left py-3 px-2 font-medium">Thời gian</th>
                    <th className="text-left py-3 px-2 font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEscalations.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="max-w-xs truncate font-medium">{item.alertTitle}</div>
                        {item.alertMessage && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {item.alertMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{item.alertType}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={severityColors[item.severity]}>
                          {item.severity === "low" ? "Thấp" :
                           item.severity === "medium" ? "TB" :
                           item.severity === "high" ? "Cao" : "Nghiêm trọng"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={statusColors[item.status]}>
                          {item.status === "active" ? "Hoạt động" :
                           item.status === "acknowledged" ? "Đã xác nhận" :
                           item.status === "resolved" ? "Đã giải quyết" : "Tự động"}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm">{item.currentLevel}/{item.maxLevel}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEscalation(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {item.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActionDialog({ type: "acknowledge", id: item.id })}
                            >
                              <Check className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          {(item.status === "active" || item.status === "acknowledged") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActionDialog({ type: "resolve", id: item.id })}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEscalations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Không có dữ liệu escalation
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {escalations && escalations.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Trang {page} / {escalations.totalPages} ({escalations.total} bản ghi)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(escalations.totalPages, p + 1))}
                    disabled={page === escalations.totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Detail Dialog */}
        <Dialog open={!!selectedEscalation} onOpenChange={() => setSelectedEscalation(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi tiết Escalation</DialogTitle>
            </DialogHeader>
            {selectedEscalation && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Tiêu đề</label>
                    <p className="font-medium">{selectedEscalation.alertTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Loại cảnh báo</label>
                    <p><Badge variant="outline">{selectedEscalation.alertType}</Badge></p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Mức độ</label>
                    <p><Badge className={severityColors[selectedEscalation.severity]}>
                      {selectedEscalation.severity}
                    </Badge></p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Trạng thái</label>
                    <p><Badge className={statusColors[selectedEscalation.status]}>
                      {selectedEscalation.status}
                    </Badge></p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Level</label>
                    <p>{selectedEscalation.currentLevel} / {selectedEscalation.maxLevel}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Thông báo đã gửi</label>
                    <p>{selectedEscalation.notificationsSent}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Thời gian tạo</label>
                    <p>{new Date(selectedEscalation.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  {selectedEscalation.resolvedAt && (
                    <div>
                      <label className="text-sm text-muted-foreground">Thời gian giải quyết</label>
                      <p>{new Date(selectedEscalation.resolvedAt).toLocaleString("vi-VN")}</p>
                    </div>
                  )}
                </div>
                {selectedEscalation.alertMessage && (
                  <div>
                    <label className="text-sm text-muted-foreground">Nội dung</label>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{selectedEscalation.alertMessage}</p>
                  </div>
                )}
                {selectedEscalation.notes && (
                  <div>
                    <label className="text-sm text-muted-foreground">Ghi chú</label>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{selectedEscalation.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Action Dialog */}
        <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog?.type === "acknowledge" ? "Xác nhận Escalation" : "Giải quyết Escalation"}
              </DialogTitle>
              <DialogDescription>
                {actionDialog?.type === "acknowledge" 
                  ? "Xác nhận rằng bạn đã nhận được và đang xử lý escalation này."
                  : "Đánh dấu escalation này đã được giải quyết."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ghi chú (tùy chọn)</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Nhập ghi chú..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Hủy
              </Button>
              <Button 
                onClick={handleAction}
                disabled={acknowledgeMutation.isPending || resolveMutation.isPending}
              >
                {acknowledgeMutation.isPending || resolveMutation.isPending 
                  ? "Đang xử lý..." 
                  : actionDialog?.type === "acknowledge" ? "Xác nhận" : "Giải quyết"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
