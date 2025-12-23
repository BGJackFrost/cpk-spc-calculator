/**
 * Scheduled KPI Reports Management Page
 * Quản lý lịch gửi báo cáo KPI tự động qua email
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Mail, 
  Clock, 
  Calendar,
  Send,
  History,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface ReportFormData {
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek: number;
  dayOfMonth: number;
  timeOfDay: string;
  productionLineIds: number[];
  reportType: "shift_summary" | "kpi_comparison" | "trend_analysis" | "full_report";
  includeCharts: boolean;
  includeDetails: boolean;
  recipients: string;
  ccRecipients: string;
}

const DEFAULT_FORM_DATA: ReportFormData = {
  name: "",
  description: "",
  frequency: "weekly",
  dayOfWeek: 1,
  dayOfMonth: 1,
  timeOfDay: "08:00",
  productionLineIds: [],
  reportType: "shift_summary",
  includeCharts: true,
  includeDetails: true,
  recipients: "",
  ccRecipients: ""
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" }
];

const REPORT_TYPES = [
  { value: "shift_summary", label: "Tổng hợp theo Ca" },
  { value: "kpi_comparison", label: "So sánh KPI" },
  { value: "trend_analysis", label: "Phân tích Xu hướng" },
  { value: "full_report", label: "Báo cáo Đầy đủ" }
];

export default function ScheduledKpiReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(DEFAULT_FORM_DATA);
  const [activeTab, setActiveTab] = useState("reports");

  const { data: reports, refetch } = trpc.shiftManager.getScheduledReports.useQuery();
  const { data: reportHistory } = trpc.shiftManager.getReportHistory.useQuery({ limit: 50 });
  const { data: productionLines } = trpc.productionLine.getAll.useQuery();

  const createMutation = trpc.shiftManager.createScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo lịch báo cáo");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const updateMutation = trpc.shiftManager.updateScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật lịch báo cáo");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const deleteMutation = trpc.shiftManager.deleteScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa lịch báo cáo");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const toggleMutation = trpc.shiftManager.toggleScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const sendNowMutation = trpc.shiftManager.sendReportNow.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi báo cáo thành công");
      } else {
        toast.error(`Gửi báo cáo thất bại: ${result.error}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (report: any) => {
    setEditingId(report.id);
    setFormData({
      name: report.name,
      description: report.description || "",
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek || 1,
      dayOfMonth: report.dayOfMonth || 1,
      timeOfDay: report.timeOfDay,
      productionLineIds: report.productionLineIds || [],
      reportType: report.reportType,
      includeCharts: report.includeCharts,
      includeDetails: report.includeDetails,
      recipients: report.recipients.join(", "),
      ccRecipients: report.ccRecipients.join(", ")
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const recipients = formData.recipients.split(",").map(e => e.trim()).filter(Boolean);
    const ccRecipients = formData.ccRecipients.split(",").map(e => e.trim()).filter(Boolean);

    if (!formData.name) {
      toast.error("Vui lòng nhập tên báo cáo");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Vui lòng nhập ít nhất một email người nhận");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
        timeOfDay: formData.timeOfDay,
        productionLineIds: formData.productionLineIds.length > 0 ? formData.productionLineIds : undefined,
        reportType: formData.reportType,
        includeCharts: formData.includeCharts,
        includeDetails: formData.includeDetails,
        recipients,
        ccRecipients
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
        dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
        timeOfDay: formData.timeOfDay,
        productionLineIds: formData.productionLineIds.length > 0 ? formData.productionLineIds : undefined,
        reportType: formData.reportType,
        includeCharts: formData.includeCharts,
        includeDetails: formData.includeDetails,
        recipients,
        ccRecipients
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa lịch báo cáo này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleSendNow = (id: number) => {
    if (confirm("Bạn có muốn gửi báo cáo ngay bây giờ?")) {
      sendNowMutation.mutate({ id });
    }
  };

  const getFrequencyLabel = (report: any) => {
    switch (report.frequency) {
      case "daily":
        return `Hàng ngày lúc ${report.timeOfDay}`;
      case "weekly":
        const day = DAYS_OF_WEEK.find(d => d.value === report.dayOfWeek);
        return `${day?.label || "?"} hàng tuần lúc ${report.timeOfDay}`;
      case "monthly":
        return `Ngày ${report.dayOfMonth} hàng tháng lúc ${report.timeOfDay}`;
      default:
        return report.frequency;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "failed":
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Đang chờ</Badge>;
      default:
        return <Badge variant="outline">Chưa gửi</Badge>;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Lịch Gửi Báo cáo KPI
          </h1>
          <p className="text-muted-foreground">
            Cấu hình gửi báo cáo KPI tự động qua email theo lịch định kỳ
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo lịch mới
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng lịch báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đang hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports?.filter(r => r.isEnabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đã tạm dừng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {reports?.filter(r => !r.isEnabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gửi thành công (gần đây)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reportHistory?.filter(h => h.status === "sent").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lịch báo cáo
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lịch sử gửi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách Lịch Báo cáo</CardTitle>
              <CardDescription>
                Quản lý các lịch gửi báo cáo KPI tự động
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên báo cáo</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Lịch gửi</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-center">Lần gửi cuối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-xs text-muted-foreground">{report.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {REPORT_TYPES.find(t => t.value === report.reportType)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getFrequencyLabel(report)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {report.recipients.slice(0, 2).join(", ")}
                          {report.recipients.length > 2 && ` +${report.recipients.length - 2}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={report.isEnabled}
                          onCheckedChange={(checked) => handleToggle(report.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          {getStatusBadge(report.lastStatus)}
                          {report.lastSentAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(report.lastSentAt).toLocaleString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendNow(report.id)}
                            title="Gửi ngay"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(report)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(report.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!reports || reports.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Chưa có lịch báo cáo nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử Gửi Báo cáo</CardTitle>
              <CardDescription>
                50 lần gửi báo cáo gần nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Tên báo cáo</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Tần suất</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportHistory?.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        {history.sentAt 
                          ? new Date(history.sentAt).toLocaleString("vi-VN")
                          : new Date(history.createdAt).toLocaleString("vi-VN")
                        }
                      </TableCell>
                      <TableCell className="font-medium">{history.reportName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {REPORT_TYPES.find(t => t.value === history.reportType)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{history.frequency}</TableCell>
                      <TableCell className="text-sm">
                        {history.recipients.split(",").slice(0, 2).join(", ")}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(history.status)}
                        {history.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">{history.errorMessage}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!reportHistory || reportHistory.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Chưa có lịch sử gửi báo cáo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Chỉnh sửa Lịch Báo cáo" : "Tạo Lịch Báo cáo mới"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình lịch gửi báo cáo KPI tự động qua email
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <Label>Tên báo cáo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Báo cáo KPI hàng tuần"
              />
            </div>

            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn về báo cáo"
              />
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Loại báo cáo</Label>
              <Select
                value={formData.reportType}
                onValueChange={(value: any) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tần suất</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Thời gian gửi</Label>
                <Input
                  type="time"
                  value={formData.timeOfDay}
                  onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })}
                />
              </div>
            </div>

            {formData.frequency === "weekly" && (
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
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "monthly" && (
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
                      <SelectItem key={day} value={day.toString()}>
                        Ngày {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Production Lines */}
            <div className="space-y-2">
              <Label>Dây chuyền (để trống = tất cả)</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
                {productionLines?.map((line) => (
                  <Badge
                    key={line.id}
                    variant={formData.productionLineIds.includes(line.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formData.productionLineIds.includes(line.id)) {
                        setFormData({
                          ...formData,
                          productionLineIds: formData.productionLineIds.filter(id => id !== line.id)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          productionLineIds: [...formData.productionLineIds, line.id]
                        });
                      }
                    }}
                  >
                    {line.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeCharts}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeCharts: checked })}
                />
                <Label>Bao gồm biểu đồ</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includeDetails}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeDetails: checked })}
                />
                <Label>Bao gồm chi tiết</Label>
              </div>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <Label>Email người nhận *</Label>
              <Textarea
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Nhập các email cách nhau bởi dấu phẩy
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email CC (tùy chọn)</Label>
              <Textarea
                value={formData.ccRecipients}
                onChange={(e) => setFormData({ ...formData, ccRecipients: e.target.value })}
                placeholder="cc1@example.com, cc2@example.com"
              />
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
    </div>
  );
}
