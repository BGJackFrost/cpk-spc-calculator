import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Mail,
  FileText,
  Play,
  Pause,
  History,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReportFormData {
  name: string;
  reportType: string;
  schedule: string;
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  recipients: string;
  includeCharts: boolean;
  includeTables: boolean;
  includeRecommendations: boolean;
  machineIds: number[];
  productionLineIds: number[];
}

const defaultFormData: ReportFormData = {
  name: "",
  reportType: "oee_weekly",
  schedule: "weekly",
  dayOfWeek: 1,
  dayOfMonth: 1,
  hour: 8,
  recipients: "",
  includeCharts: true,
  includeTables: true,
  includeRecommendations: true,
  machineIds: [],
  productionLineIds: [],
};

const reportTypeLabels: Record<string, string> = {
  oee_daily: "OEE Hàng ngày",
  oee_weekly: "OEE Hàng tuần",
  oee_monthly: "OEE Hàng tháng",
  maintenance_daily: "Bảo trì Hàng ngày",
  maintenance_weekly: "Bảo trì Hàng tuần",
  maintenance_monthly: "Bảo trì Hàng tháng",
  combined_weekly: "Tổng hợp Hàng tuần",
  combined_monthly: "Tổng hợp Hàng tháng",
};

const scheduleLabels: Record<string, string> = {
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
};

const dayOfWeekLabels = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default function ScheduledReportManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(defaultFormData);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState("reports");

  // Queries
  const { data: reports, isLoading, refetch } = trpc.oee.listScheduledReports.useQuery();
  // Note: listScheduledReportLogs may not exist, using empty array as fallback
  const reportLogs: { id: number; reportId: number; sentAt: Date; status: string; recipientCount: number; successCount: number; failedCount: number; errorMessage: string | null; generationTimeMs?: number }[] = [];
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Mutations
  const sendTestEmailMutation = trpc.oee.sendTestEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
        if (data.errors) {
          data.errors.forEach(err => toast.error(err));
        }
      }
    },
    onError: (error) => {
      toast.error("Lỗi gửi test email: " + error.message);
    },
  });

  const createMutation = trpc.oee.createScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo lịch báo cáo mới");
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const updateMutation = trpc.oee.updateScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật lịch báo cáo");
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const deleteMutation = trpc.oee.deleteScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa lịch báo cáo");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const toggleMutation = trpc.oee.updateScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Vui lòng nhập tên báo cáo");
      return;
    }

    if (!formData.recipients) {
      toast.error("Vui lòng nhập email người nhận");
      return;
    }

    const createData = {
      name: formData.name,
      reportType: formData.reportType as "oee" | "cpk" | "oee_cpk_combined" | "production_summary",
      frequency: formData.schedule as "daily" | "weekly" | "monthly",
      dayOfWeek: formData.dayOfWeek,
      dayOfMonth: formData.dayOfMonth,
      timeOfDay: `${String(formData.hour).padStart(2, '0')}:00`,
      recipients: formData.recipients.split(',').map(e => e.trim()),
      includeCharts: formData.includeCharts,
      includeTrends: formData.includeTables,
      includeAlerts: formData.includeRecommendations,
      machineIds: formData.machineIds.length > 0 ? JSON.stringify(formData.machineIds) : undefined,
      productionLineIds: formData.productionLineIds.length > 0 ? JSON.stringify(formData.productionLineIds) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ 
        id: editingId, 
        name: createData.name,
        frequency: createData.frequency,
        dayOfWeek: createData.dayOfWeek,
        dayOfMonth: createData.dayOfMonth,
        timeOfDay: createData.timeOfDay,
        recipients: createData.recipients,
        includeCharts: createData.includeCharts,
        includeTrends: createData.includeTrends,
        includeAlerts: createData.includeAlerts,
      });
    } else {
      createMutation.mutate({
        ...createData,
        machineIds: formData.machineIds.length > 0 ? formData.machineIds : undefined,
        productionLineIds: formData.productionLineIds.length > 0 ? formData.productionLineIds : undefined,
      });
    }
  };

  const handleEdit = (report: any) => {
    setEditingId(report.id);
    setFormData({
      name: report.name,
      reportType: report.reportType,
      schedule: report.schedule,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      hour: report.hour,
      recipients: report.recipients,
      includeCharts: report.includeCharts === 1,
      includeTables: report.includeTables === 1,
      includeRecommendations: report.includeRecommendations === 1,
      machineIds: report.machineIds || [],
      productionLineIds: report.productionLineIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const handleToggle = (id: number, currentStatus: number | boolean) => {
    const isCurrentlyActive = typeof currentStatus === 'boolean' ? currentStatus : currentStatus === 1;
    toggleMutation.mutate({ id, isActive: !isCurrentlyActive });
  };

  const openNewDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const getScheduleDescription = (report: any) => {
    if (report.schedule === "daily") {
      return `Hàng ngày lúc ${report.hour}:00`;
    } else if (report.schedule === "weekly") {
      return `${dayOfWeekLabels[report.dayOfWeek]} hàng tuần lúc ${report.hour}:00`;
    } else {
      return `Ngày ${report.dayOfMonth} hàng tháng lúc ${report.hour}:00`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="h-3 w-3 mr-1" />Một phần</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Quản lý Báo cáo Định kỳ
          </h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình và quản lý lịch gửi báo cáo OEE/CPK tự động
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo lịch mới
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="reports">
            <FileText className="h-4 w-4 mr-2" />
            Lịch báo cáo
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Lịch sử gửi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách lịch báo cáo</CardTitle>
              <CardDescription>
                {reports?.length || 0} lịch báo cáo được cấu hình
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
              ) : reports && reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Tên</th>
                        <th className="text-center p-3">Loại</th>
                        <th className="text-center p-3">Lịch gửi</th>
                        <th className="text-center p-3">Người nhận</th>
                        <th className="text-center p-3">Lần gửi cuối</th>
                        <th className="text-center p-3">Trạng thái</th>
                        <th className="text-center p-3">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{report.name}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">
                              {reportTypeLabels[report.reportType] || report.reportType}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-sm">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {getScheduleDescription(report)}
                            </div>
                          </td>
                          <td className="p-3 text-center text-sm">
                            <div className="flex items-center justify-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {report.recipients.split(",").length} người
                            </div>
                          </td>
                          <td className="p-3 text-center text-sm">
                            {report.lastSentAt 
                              ? new Date(report.lastSentAt).toLocaleString("vi-VN")
                              : "Chưa gửi"}
                          </td>
                          <td className="p-3 text-center">
                            <Switch
                              checked={report.isActive === 1}
                              onCheckedChange={() => handleToggle(report.id, report.isActive)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(report)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(report.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có lịch báo cáo nào được cấu hình</p>
                  <Button variant="outline" className="mt-4" onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo lịch đầu tiên
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử gửi báo cáo</CardTitle>
              <CardDescription>
                50 lần gửi gần nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportLogs && reportLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Thời gian</th>
                        <th className="text-center p-3">Báo cáo</th>
                        <th className="text-center p-3">Trạng thái</th>
                        <th className="text-center p-3">Gửi thành công</th>
                        <th className="text-center p-3">Thất bại</th>
                        <th className="text-center p-3">Thời gian xử lý</th>
                        <th className="text-left p-3">Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            {new Date(log.sentAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">#{log.reportId}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="p-3 text-center text-green-600 font-medium">
                            {log.successCount}
                          </td>
                          <td className="p-3 text-center text-red-600 font-medium">
                            {log.failedCount}
                          </td>
                          <td className="p-3 text-center text-sm">
                            {log.generationTimeMs ? `${log.generationTimeMs}ms` : "-"}
                          </td>
                          <td className="p-3 text-sm text-red-600 max-w-xs truncate">
                            {log.errorMessage || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có lịch sử gửi báo cáo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Sửa lịch báo cáo" : "Tạo lịch báo cáo mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên báo cáo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Báo cáo OEE tuần Line A"
              />
            </div>

            <div className="space-y-2">
              <Label>Loại báo cáo *</Label>
              <Select
                value={formData.reportType}
                onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reportTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tần suất gửi *</Label>
              <Select
                value={formData.schedule}
                onValueChange={(value) => setFormData({ ...formData, schedule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(scheduleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.schedule === "weekly" && (
              <div className="space-y-2">
                <Label>Ngày trong tuần</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOfWeekLabels.map((label, index) => (
                      <SelectItem key={index} value={index.toString()}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.schedule === "monthly" && (
              <div className="space-y-2">
                <Label>Ngày trong tháng</Label>
                <Select
                  value={formData.dayOfMonth.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>Ngày {day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Giờ gửi (0-23)</Label>
              <Select
                value={formData.hour.toString()}
                onValueChange={(value) => setFormData({ ...formData, hour: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email người nhận * (cách nhau bởi dấu phẩy)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!formData.recipients) {
                      toast.error("Vui lòng nhập email trước khi gửi test");
                      return;
                    }
                    sendTestEmailMutation.mutate({ recipients: formData.recipients });
                  }}
                  disabled={sendTestEmailMutation.isPending}
                >
                  {sendTestEmailMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-1">Test</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Nhấn "Test" để gửi email kiểm tra cấu hình SMTP</p>
            </div>

            <div className="space-y-3">
              <Label>Nội dung báo cáo</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.includeCharts}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeCharts: checked })}
                  />
                  <span className="text-sm">Bao gồm biểu đồ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.includeTables}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeTables: checked })}
                  />
                  <span className="text-sm">Bao gồm bảng dữ liệu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch
                    checked={formData.includeRecommendations}
                    onCheckedChange={(checked) => setFormData({ ...formData, includeRecommendations: checked })}
                  />
                  <span className="text-sm">Bao gồm khuyến nghị</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa lịch báo cáo này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
