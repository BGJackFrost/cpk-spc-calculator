/**
 * Scheduled KPI Reports Management Page
 * Trang quản lý lịch gửi báo cáo KPI với preview template
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Calendar, Plus, Pencil, Trash2, Send, Clock, Mail, 
  CheckCircle, XCircle, Eye, RefreshCw, Play, Pause,
  FileText, History, AlertCircle
} from "lucide-react";

interface ReportFormData {
  name: string;
  reportType: string;
  frequency: string;
  scheduleTime: string;
  scheduleDayOfWeek: number | null;
  scheduleDayOfMonth: number | null;
  productionLineIds: number[];
  recipients: string;
  ccRecipients: string;
  enabled: boolean;
}

const DEFAULT_REPORT: ReportFormData = {
  name: "",
  reportType: "full_report",
  frequency: "weekly",
  scheduleTime: "08:00",
  scheduleDayOfWeek: 1, // Monday
  scheduleDayOfMonth: 1,
  productionLineIds: [],
  recipients: "",
  ccRecipients: "",
  enabled: true,
};

const REPORT_TYPES = [
  { value: "shift_summary", label: "Tổng hợp theo ca", description: "Báo cáo KPI theo ca làm việc" },
  { value: "kpi_comparison", label: "So sánh KPI", description: "So sánh KPI giữa các tuần" },
  { value: "trend_analysis", label: "Phân tích xu hướng", description: "Phân tích xu hướng KPI 12 tuần" },
  { value: "full_report", label: "Báo cáo đầy đủ", description: "Báo cáo KPI toàn diện" },
];

const FREQUENCIES = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Chủ nhật" },
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
];

export default function ScheduledKpiReportsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ReportFormData>(DEFAULT_REPORT);
  const [selectedTab, setSelectedTab] = useState("reports");
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // Fetch data
  const { data: reports, isLoading, refetch } = trpc.kpiDashboard.getScheduledReports.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: reportHistory } = trpc.kpiDashboard.getReportHistory.useQuery(
    { reportId: selectedReportId!, limit: 20 },
    { enabled: !!selectedReportId }
  );

  // Mutations
  const createMutation = trpc.kpiDashboard.createScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo lịch báo cáo thành công");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.kpiDashboard.updateScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật lịch báo cáo thành công");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.kpiDashboard.deleteScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa lịch báo cáo thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const toggleMutation = trpc.kpiDashboard.toggleScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const sendNowMutation = trpc.kpiDashboard.sendReportNow.useMutation({
    onSuccess: () => {
      toast.success("Đã gửi báo cáo thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi gửi báo cáo: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData(DEFAULT_REPORT);
    setEditingId(null);
  };

  const handleEdit = (report: any) => {
    setEditingId(report.id);
    setFormData({
      name: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      scheduleTime: report.scheduleTime || "08:00",
      scheduleDayOfWeek: report.scheduleDayOfWeek,
      scheduleDayOfMonth: report.scheduleDayOfMonth,
      productionLineIds: report.productionLineIds || [],
      recipients: report.recipients?.join(", ") || "",
      ccRecipients: report.ccRecipients?.join(", ") || "",
      enabled: report.enabled ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa lịch báo cáo này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const handleSendNow = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn gửi báo cáo ngay bây giờ?")) {
      sendNowMutation.mutate({ id });
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên báo cáo");
      return;
    }
    if (!formData.recipients.trim()) {
      toast.error("Vui lòng nhập email người nhận");
      return;
    }

    const recipientsList = formData.recipients.split(",").map(e => e.trim()).filter(Boolean);
    const ccList = formData.ccRecipients.split(",").map(e => e.trim()).filter(Boolean);

    const data = {
      name: formData.name,
      reportType: formData.reportType,
      frequency: formData.frequency,
      scheduleTime: formData.scheduleTime,
      scheduleDayOfWeek: formData.frequency === "weekly" ? formData.scheduleDayOfWeek : null,
      scheduleDayOfMonth: formData.frequency === "monthly" ? formData.scheduleDayOfMonth : null,
      productionLineIds: formData.productionLineIds,
      recipients: recipientsList,
      ccRecipients: ccList,
      enabled: formData.enabled,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePreview = (report: any) => {
    // Generate preview HTML based on report type
    const previewContent = generatePreviewHtml(report);
    setPreviewHtml(previewContent);
    setIsPreviewOpen(true);
  };

  const generatePreviewHtml = (report: any) => {
    const now = new Date();
    const reportTypeLabel = REPORT_TYPES.find(t => t.value === report.reportType)?.label || report.reportType;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; }
          .header p { margin: 0; opacity: 0.9; }
          .content { padding: 30px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #1f2937; font-size: 18px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: 600; color: #374151; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
          .badge-good { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-critical { background: #fee2e2; color: #991b1b; }
          .trend-up { color: #16a34a; }
          .trend-down { color: #dc2626; }
          .chart-placeholder { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 40px; text-align: center; color: #6b7280; }
          .footer { background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 ${report.name}</h1>
            <p>Loại báo cáo: ${reportTypeLabel} | Ngày: ${now.toLocaleDateString("vi-VN")}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>📈 Tổng quan KPI</h2>
              <table>
                <thead>
                  <tr>
                    <th>Dây chuyền</th>
                    <th>CPK TB</th>
                    <th>OEE TB</th>
                    <th>Tỷ lệ lỗi</th>
                    <th>Xu hướng</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Line A</td>
                    <td>1.45</td>
                    <td>82.5%</td>
                    <td>1.2%</td>
                    <td class="trend-up">↑ +3.2%</td>
                    <td><span class="badge badge-good">Tốt</span></td>
                  </tr>
                  <tr>
                    <td>Line B</td>
                    <td>1.28</td>
                    <td>76.8%</td>
                    <td>2.1%</td>
                    <td class="trend-down">↓ -1.5%</td>
                    <td><span class="badge badge-warning">Cảnh báo</span></td>
                  </tr>
                  <tr>
                    <td>Line C</td>
                    <td>0.95</td>
                    <td>58.2%</td>
                    <td>4.5%</td>
                    <td class="trend-down">↓ -5.8%</td>
                    <td><span class="badge badge-critical">Nguy hiểm</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>📊 Biểu đồ xu hướng</h2>
              <div class="chart-placeholder">
                [Biểu đồ CPK/OEE trend sẽ được hiển thị ở đây]
                <br><br>
                <small>Biểu đồ inline base64 sẽ được tạo tự động khi gửi email</small>
              </div>
            </div>

            <div class="section">
              <h2>⚠️ Cảnh báo</h2>
              <table>
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Dây chuyền</th>
                    <th>Mô tả</th>
                    <th>Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span class="badge badge-critical">Critical</span></td>
                    <td>Line C</td>
                    <td>CPK dưới ngưỡng critical</td>
                    <td>0.95 (ngưỡng: 1.00)</td>
                  </tr>
                  <tr>
                    <td><span class="badge badge-warning">Warning</span></td>
                    <td>Line B</td>
                    <td>CPK dưới ngưỡng warning</td>
                    <td>1.28 (ngưỡng: 1.33)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>💡 Khuyến nghị</h2>
              <ul>
                <li>Kiểm tra và hiệu chỉnh máy móc trên Line C để cải thiện CPK</li>
                <li>Phân tích nguyên nhân xu hướng giảm OEE trên Line B và C</li>
                <li>Duy trì các quy trình hiện tại trên Line A</li>
              </ul>
            </div>
          </div>
          
          <div class="footer">
            <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
            <p>Thời gian: ${now.toLocaleString("vi-VN")} | Tần suất: ${FREQUENCIES.find(f => f.value === report.frequency)?.label}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const getScheduleDescription = (report: any) => {
    const time = report.scheduleTime || "08:00";
    switch (report.frequency) {
      case "daily":
        return `Hàng ngày lúc ${time}`;
      case "weekly":
        const day = DAYS_OF_WEEK.find(d => d.value === report.scheduleDayOfWeek)?.label || "Thứ 2";
        return `${day} hàng tuần lúc ${time}`;
      case "monthly":
        return `Ngày ${report.scheduleDayOfMonth || 1} hàng tháng lúc ${time}`;
      default:
        return report.frequency;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Quản lý Lịch Báo cáo KPI
            </h1>
            <p className="text-muted-foreground">
              Cấu hình và quản lý lịch gửi báo cáo KPI tự động qua email
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo lịch mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Chỉnh sửa lịch báo cáo" : "Tạo lịch báo cáo mới"}
                  </DialogTitle>
                  <DialogDescription>
                    Cấu hình lịch gửi báo cáo KPI tự động
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  {/* Report Name */}
                  <div className="space-y-2">
                    <Label>Tên báo cáo *</Label>
                    <Input
                      placeholder="VD: Báo cáo KPI hàng tuần"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Report Type */}
                  <div className="space-y-2">
                    <Label>Loại báo cáo</Label>
                    <Select
                      value={formData.reportType}
                      onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Schedule Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Lịch gửi
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tần suất</Label>
                        <Select
                          value={formData.frequency}
                          onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Giờ gửi</Label>
                        <Input
                          type="time"
                          value={formData.scheduleTime}
                          onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                        />
                      </div>
                    </div>

                    {formData.frequency === "weekly" && (
                      <div className="space-y-2">
                        <Label>Ngày trong tuần</Label>
                        <Select
                          value={formData.scheduleDayOfWeek?.toString() || "1"}
                          onValueChange={(value) => setFormData({ ...formData, scheduleDayOfWeek: parseInt(value) })}
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
                          value={formData.scheduleDayOfMonth?.toString() || "1"}
                          onValueChange={(value) => setFormData({ ...formData, scheduleDayOfMonth: parseInt(value) })}
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
                  </div>

                  <Separator />

                  {/* Recipients */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Người nhận
                    </h4>
                    <div className="space-y-2">
                      <Label>Email người nhận * (phân cách bằng dấu phẩy)</Label>
                      <Textarea
                        placeholder="email1@example.com, email2@example.com"
                        value={formData.recipients}
                        onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CC (phân cách bằng dấu phẩy)</Label>
                      <Textarea
                        placeholder="cc1@example.com, cc2@example.com"
                        value={formData.ccRecipients}
                        onChange={(e) => setFormData({ ...formData, ccRecipients: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Enable/Disable */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Kích hoạt lịch gửi</Label>
                      <p className="text-xs text-muted-foreground">
                        Bật/tắt việc gửi báo cáo tự động theo lịch
                      </p>
                    </div>
                    <Switch
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
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
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="reports">Lịch báo cáo</TabsTrigger>
            <TabsTrigger value="history">Lịch sử gửi</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách lịch báo cáo</CardTitle>
                <CardDescription>
                  Quản lý các lịch gửi báo cáo KPI tự động
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : !reports || reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch báo cáo nào được tạo
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên báo cáo</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Lịch gửi</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead>Lần gửi cuối</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report: any) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {report.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {REPORT_TYPES.find(t => t.value === report.reportType)?.label || report.reportType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {getScheduleDescription(report)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {report.recipients?.length || 0} người nhận
                              {report.ccRecipients?.length > 0 && (
                                <span className="text-muted-foreground"> (+{report.ccRecipients.length} CC)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={report.enabled}
                              onCheckedChange={(checked) => handleToggle(report.id, checked)}
                            />
                          </TableCell>
                          <TableCell>
                            {report.lastSentAt ? (
                              <div className="text-sm">
                                <div>{new Date(report.lastSentAt).toLocaleDateString("vi-VN")}</div>
                                <div className="text-xs text-muted-foreground">
                                  {report.lastStatus === "success" ? (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Thành công
                                    </span>
                                  ) : (
                                    <span className="text-red-600 flex items-center gap-1">
                                      <XCircle className="h-3 w-3" /> Thất bại
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Chưa gửi</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(report)}
                                title="Xem trước"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSendNow(report.id)}
                                title="Gửi ngay"
                                disabled={sendNowMutation.isPending}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedReportId(report.id);
                                  setSelectedTab("history");
                                }}
                                title="Xem lịch sử"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(report)}
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
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Lịch sử gửi báo cáo
                </CardTitle>
                <CardDescription>
                  {selectedReportId 
                    ? `Lịch sử gửi của báo cáo #${selectedReportId}`
                    : "Chọn một báo cáo để xem lịch sử gửi"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedReportId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Vui lòng chọn một báo cáo từ tab "Lịch báo cáo" để xem lịch sử
                  </div>
                ) : !reportHistory || reportHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có lịch sử gửi báo cáo
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Tên báo cáo</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead>Lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportHistory.map((history: any) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {new Date(history.sentAt || history.createdAt).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell className="font-medium">{history.reportName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{history.reportType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{history.recipients}</TableCell>
                          <TableCell className="text-center">
                            {history.status === "sent" ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Đã gửi
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Thất bại
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-red-600">
                            {history.errorMessage || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Xem trước template email</DialogTitle>
              <DialogDescription>
                Đây là bản xem trước của email báo cáo KPI sẽ được gửi
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh] border rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
