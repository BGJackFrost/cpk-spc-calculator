/**
 * Scheduled Email Reports Management Page
 * Trang quản lý báo cáo email định kỳ với biểu đồ Radar Chart
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail, Plus, Calendar, Clock, Send, Trash2, Edit, MoreVertical,
  CheckCircle, XCircle, AlertCircle, History, Users, FileText, BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const REPORT_TYPES = [
  { value: "spc_summary", label: "Tổng hợp SPC", icon: BarChart3 },
  { value: "cpk_analysis", label: "Phân tích CPK", icon: BarChart3 },
  { value: "violation_report", label: "Báo cáo vi phạm", icon: AlertCircle },
  { value: "production_line_status", label: "Trạng thái dây chuyền", icon: FileText },
  { value: "radar_chart_comparison", label: "So sánh Radar Chart", icon: BarChart3 },
];

const SCHEDULE_TYPES = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ hai" },
  { value: 2, label: "Thứ ba" },
  { value: 3, label: "Thứ tư" },
  { value: 4, label: "Thứ năm" },
  { value: 5, label: "Thứ sáu" },
  { value: 6, label: "Thứ bảy" },
];

export default function ScheduledEmailReports() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    reportType: "radar_chart_comparison",
    scheduleType: "weekly",
    scheduleTime: "08:00",
    scheduleDayOfWeek: 1,
    scheduleDayOfMonth: 1,
    recipients: "",
    ccRecipients: "",
    includeCharts: true,
    includeRawData: false,
  });
  
  // Queries
  const { data: reports, isLoading, refetch } = trpc.scheduledReport.list.useQuery({
    includeInactive: true,
  });
  
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  
  const { data: logs } = trpc.scheduledReport.getLogs.useQuery(
    { reportId: selectedReport?.id || 0, limit: 20 },
    { enabled: !!selectedReport && isLogsDialogOpen }
  );
  
  // Mutations
  const createMutation = trpc.scheduledReport.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo báo cáo định kỳ thành công");
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Lỗi tạo báo cáo");
    },
  });
  
  const updateMutation = trpc.scheduledReport.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật báo cáo thành công");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Lỗi cập nhật báo cáo");
    },
  });
  
  const deleteMutation = trpc.scheduledReport.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa báo cáo thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Lỗi xóa báo cáo");
    },
  });
  
  const sendNowMutation = trpc.scheduledReport.sendNow.useMutation({
    onSuccess: () => {
      toast.success("Đã gửi báo cáo thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Lỗi gửi báo cáo");
    },
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      reportType: "radar_chart_comparison",
      scheduleType: "weekly",
      scheduleTime: "08:00",
      scheduleDayOfWeek: 1,
      scheduleDayOfMonth: 1,
      recipients: "",
      ccRecipients: "",
      includeCharts: true,
      includeRawData: false,
    });
  };
  
  const handleCreate = () => {
    const recipients = formData.recipients.split(",").map(e => e.trim()).filter(e => e);
    const ccRecipients = formData.ccRecipients.split(",").map(e => e.trim()).filter(e => e);
    
    if (recipients.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 email người nhận");
      return;
    }
    
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      reportType: formData.reportType as any,
      scheduleType: formData.scheduleType as any,
      scheduleTime: formData.scheduleTime,
      scheduleDayOfWeek: formData.scheduleType === "weekly" ? formData.scheduleDayOfWeek : undefined,
      scheduleDayOfMonth: formData.scheduleType === "monthly" ? formData.scheduleDayOfMonth : undefined,
      recipients,
      ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
      includeCharts: formData.includeCharts,
      includeRawData: formData.includeRawData,
    });
  };
  
  const handleEdit = (report: any) => {
    setSelectedReport(report);
    setFormData({
      name: report.name,
      description: report.description || "",
      reportType: report.reportType,
      scheduleType: report.scheduleType,
      scheduleTime: report.scheduleTime,
      scheduleDayOfWeek: report.scheduleDayOfWeek || 1,
      scheduleDayOfMonth: report.scheduleDayOfMonth || 1,
      recipients: (typeof report.recipients === 'string' ? JSON.parse(report.recipients) : report.recipients).join(", "),
      ccRecipients: report.ccRecipients 
        ? (typeof report.ccRecipients === 'string' ? JSON.parse(report.ccRecipients) : report.ccRecipients).join(", ")
        : "",
      includeCharts: report.includeCharts === 1,
      includeRawData: report.includeRawData === 1,
    });
    setIsEditDialogOpen(true);
  };
  
  const handleUpdate = () => {
    if (!selectedReport) return;
    
    const recipients = formData.recipients.split(",").map(e => e.trim()).filter(e => e);
    const ccRecipients = formData.ccRecipients.split(",").map(e => e.trim()).filter(e => e);
    
    updateMutation.mutate({
      id: selectedReport.id,
      name: formData.name,
      description: formData.description || null,
      reportType: formData.reportType as any,
      scheduleType: formData.scheduleType as any,
      scheduleTime: formData.scheduleTime,
      scheduleDayOfWeek: formData.scheduleType === "weekly" ? formData.scheduleDayOfWeek : null,
      scheduleDayOfMonth: formData.scheduleType === "monthly" ? formData.scheduleDayOfMonth : null,
      recipients,
      ccRecipients: ccRecipients.length > 0 ? ccRecipients : null,
      includeCharts: formData.includeCharts,
      includeRawData: formData.includeRawData,
    });
  };
  
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Thành công</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Đang chờ</Badge>;
      default:
        return <Badge variant="outline">Chưa chạy</Badge>;
    }
  };
  
  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type)?.label || type;
  };
  
  const getScheduleLabel = (report: any) => {
    const time = report.scheduleTime || "08:00";
    switch (report.scheduleType) {
      case "daily":
        return `Hàng ngày lúc ${time}`;
      case "weekly":
        const day = DAYS_OF_WEEK.find(d => d.value === report.scheduleDayOfWeek)?.label || "";
        return `${day} lúc ${time}`;
      case "monthly":
        return `Ngày ${report.scheduleDayOfMonth} hàng tháng lúc ${time}`;
      default:
        return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Báo cáo Email Định kỳ
            </h1>
            <p className="text-muted-foreground">
              Quản lý báo cáo tự động gửi email với biểu đồ Radar Chart so sánh xu hướng CPK
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo báo cáo mới
          </Button>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách báo cáo</CardTitle>
            <CardDescription>
              {reports?.length || 0} báo cáo đã được cấu hình
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : reports && reports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên báo cáo</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Lịch trình</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead>Lần chạy cuối</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className={!report.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          {report.description && (
                            <p className="text-xs text-muted-foreground">{report.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getReportTypeLabel(report.reportType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {getScheduleLabel(report)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-3 w-3" />
                          {(typeof report.recipients === 'string' 
                            ? JSON.parse(report.recipients) 
                            : report.recipients
                          ).length} người
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.lastRunAt ? (
                          <span className="text-sm">
                            {format(new Date(report.lastRunAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Chưa chạy</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.lastRunStatus)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => sendNowMutation.mutate({ id: report.id })}>
                              <Send className="h-4 w-4 mr-2" />
                              Gửi ngay
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(report)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedReport(report);
                              setIsLogsDialogOpen(true);
                            }}>
                              <History className="h-4 w-4 mr-2" />
                              Lịch sử
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Bạn có chắc muốn xóa báo cáo này?")) {
                                  deleteMutation.mutate({ id: report.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có báo cáo nào</h3>
                <p className="text-muted-foreground mb-4">
                  Tạo báo cáo email định kỳ để tự động nhận thông tin CPK/SPC
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo báo cáo đầu tiên
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo báo cáo email định kỳ</DialogTitle>
              <DialogDescription>
                Cấu hình báo cáo tự động với biểu đồ Radar Chart so sánh xu hướng CPK
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên báo cáo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Báo cáo CPK hàng tuần"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại báo cáo *</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(v) => setFormData({ ...formData, reportType: v })}
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
              </div>
              
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về báo cáo..."
                  rows={2}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tần suất *</Label>
                  <Select
                    value={formData.scheduleType}
                    onValueChange={(v) => setFormData({ ...formData, scheduleType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.scheduleType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Ngày trong tuần</Label>
                    <Select
                      value={String(formData.scheduleDayOfWeek)}
                      onValueChange={(v) => setFormData({ ...formData, scheduleDayOfWeek: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {formData.scheduleType === "monthly" && (
                  <div className="space-y-2">
                    <Label>Ngày trong tháng</Label>
                    <Select
                      value={String(formData.scheduleDayOfMonth)}
                      onValueChange={(v) => setFormData({ ...formData, scheduleDayOfMonth: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            Ngày {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Thời gian gửi *</Label>
                  <Input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Email người nhận * (phân cách bằng dấu phẩy)</Label>
                <Textarea
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>CC (phân cách bằng dấu phẩy)</Label>
                <Input
                  value={formData.ccRecipients}
                  onChange={(e) => setFormData({ ...formData, ccRecipients: e.target.value })}
                  placeholder="cc1@example.com, cc2@example.com"
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.includeCharts}
                    onCheckedChange={(v) => setFormData({ ...formData, includeCharts: v })}
                  />
                  <Label>Bao gồm biểu đồ</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.includeRawData}
                    onCheckedChange={(v) => setFormData({ ...formData, includeRawData: v })}
                  />
                  <Label>Bao gồm dữ liệu thô</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang tạo..." : "Tạo báo cáo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa báo cáo</DialogTitle>
              <DialogDescription>
                Cập nhật cấu hình báo cáo email định kỳ
              </DialogDescription>
            </DialogHeader>
            
            {/* Same form as create dialog */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên báo cáo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại báo cáo *</Label>
                  <Select
                    value={formData.reportType}
                    onValueChange={(v) => setFormData({ ...formData, reportType: v })}
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
              </div>
              
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tần suất *</Label>
                  <Select
                    value={formData.scheduleType}
                    onValueChange={(v) => setFormData({ ...formData, scheduleType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.scheduleType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Ngày trong tuần</Label>
                    <Select
                      value={String(formData.scheduleDayOfWeek)}
                      onValueChange={(v) => setFormData({ ...formData, scheduleDayOfWeek: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {formData.scheduleType === "monthly" && (
                  <div className="space-y-2">
                    <Label>Ngày trong tháng</Label>
                    <Select
                      value={String(formData.scheduleDayOfMonth)}
                      onValueChange={(v) => setFormData({ ...formData, scheduleDayOfMonth: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            Ngày {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Thời gian gửi *</Label>
                  <Input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Email người nhận *</Label>
                <Textarea
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>CC</Label>
                <Input
                  value={formData.ccRecipients}
                  onChange={(e) => setFormData({ ...formData, ccRecipients: e.target.value })}
                />
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.includeCharts}
                    onCheckedChange={(v) => setFormData({ ...formData, includeCharts: v })}
                  />
                  <Label>Bao gồm biểu đồ</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.includeRawData}
                    onCheckedChange={(v) => setFormData({ ...formData, includeRawData: v })}
                  />
                  <Label>Bao gồm dữ liệu thô</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logs Dialog */}
        <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Lịch sử gửi báo cáo</DialogTitle>
              <DialogDescription>
                {selectedReport?.name}
              </DialogDescription>
            </DialogHeader>
            
            {logs && logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Email đã gửi</TableHead>
                    <TableHead>Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.startedAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.emailsSent}/{log.recipientCount}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có lịch sử gửi báo cáo
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
