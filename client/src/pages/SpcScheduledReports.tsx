import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertCircle,
  Calendar, 
  Clock, 
  FileText, 
  Mail, 
  MailCheck, 
  Pause, 
  Play, 
  Plus, 
  RefreshCw, 
  Send, 
  Trash2 
} from "lucide-react";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: 'spc_summary', label: 'Tổng hợp SPC', description: 'Báo cáo tổng hợp các chỉ số SPC' },
  { value: 'cpk_analysis', label: 'Phân tích CPK', description: 'Báo cáo chi tiết phân tích CPK' },
  { value: 'violation_report', label: 'Báo cáo vi phạm', description: 'Danh sách các vi phạm SPC' },
  { value: 'production_line_status', label: 'Trạng thái dây chuyền', description: 'Tình trạng các dây chuyền sản xuất' },
  { value: 'ai_vision_dashboard', label: 'AI Vision Dashboard', description: 'Dashboard tổng hợp AI Vision' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

interface ReportFormData {
  name: string;
  description: string;
  reportType: string;
  scheduleType: string;
  scheduleTime: string;
  scheduleDayOfWeek: number | null;
  scheduleDayOfMonth: number | null;
  recipients: string;
  ccRecipients: string;
  includeCharts: boolean;
  includeRawData: boolean;
}

const defaultFormData: ReportFormData = {
  name: '',
  description: '',
  reportType: 'spc_summary',
  scheduleType: 'daily',
  scheduleTime: '08:00',
  scheduleDayOfWeek: 1,
  scheduleDayOfMonth: 1,
  recipients: '',
  ccRecipients: '',
  includeCharts: true,
  includeRawData: false,
};

export default function SpcScheduledReports() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<ReportFormData>(defaultFormData);
  
  const { data: reports, isLoading, refetch } = trpc.scheduledReport.list.useQuery({ includeInactive: true });
  
  const createMutation = trpc.scheduledReport.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo báo cáo tự động");
      setShowCreateDialog(false);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.scheduledReport.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa báo cáo");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const toggleActiveMutation = trpc.scheduledReport.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Đã kích hoạt báo cáo" : "Đã tạm dừng báo cáo");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const sendNowMutation = trpc.scheduledReport.sendNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã gửi báo cáo đến ${data.emailsSent} người nhận`);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleCreate = () => {
    const recipients = formData.recipients.split(',').map(e => e.trim()).filter(e => e);
    const ccRecipients = formData.ccRecipients ? formData.ccRecipients.split(',').map(e => e.trim()).filter(e => e) : [];
    
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
      scheduleDayOfWeek: formData.scheduleType === 'weekly' ? formData.scheduleDayOfWeek : undefined,
      scheduleDayOfMonth: formData.scheduleType === 'monthly' ? formData.scheduleDayOfMonth : undefined,
      recipients,
      ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
      includeCharts: formData.includeCharts,
      includeRawData: formData.includeRawData,
    });
  };
  
  const getStatusBadge = (report: any) => {
    if (!report.isActive) {
      return <Badge variant="outline" className="text-gray-500">Tạm dừng</Badge>;
    }
    if (report.lastRunStatus === 'success') {
      return <Badge className="bg-green-500">Hoạt động</Badge>;
    }
    if (report.lastRunStatus === 'failed') {
      return <Badge className="bg-red-500">Lỗi</Badge>;
    }
    return <Badge className="bg-blue-500">Chờ chạy</Badge>;
  };
  
  const getScheduleText = (report: any) => {
    let text = '';
    switch (report.scheduleType) {
      case 'daily':
        text = `Hàng ngày lúc ${report.scheduleTime}`;
        break;
      case 'weekly':
        const day = DAYS_OF_WEEK.find(d => d.value === report.scheduleDayOfWeek);
        text = `${day?.label || 'Hàng tuần'} lúc ${report.scheduleTime}`;
        break;
      case 'monthly':
        text = `Ngày ${report.scheduleDayOfMonth} hàng tháng lúc ${report.scheduleTime}`;
        break;
    }
    return text;
  };
  
  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Báo cáo SPC tự động</h1>
              <p className="text-muted-foreground">Cấu hình gửi báo cáo SPC/CPK theo lịch qua email</p>
            </div>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo báo cáo mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo báo cáo SPC tự động</DialogTitle>
                <DialogDescription>
                  Cấu hình báo cáo sẽ được gửi tự động theo lịch
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Tên báo cáo *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Báo cáo SPC hàng ngày"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả ngắn về báo cáo..."
                      rows={2}
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
                        {REPORT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div>{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tần suất gửi *</Label>
                    <Select
                      value={formData.scheduleType}
                      onValueChange={(v) => setFormData({ ...formData, scheduleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Thời gian gửi *</Label>
                    <Input
                      type="time"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    />
                  </div>
                  
                  {formData.scheduleType === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <Select
                        value={formData.scheduleDayOfWeek?.toString()}
                        onValueChange={(v) => setFormData({ ...formData, scheduleDayOfWeek: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formData.scheduleType === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tháng</Label>
                      <Select
                        value={formData.scheduleDayOfMonth?.toString()}
                        onValueChange={(v) => setFormData({ ...formData, scheduleDayOfMonth: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={day.toString()}>
                              Ngày {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Email người nhận * (phân cách bằng dấu phẩy)</Label>
                    <Input
                      value={formData.recipients}
                      onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label>Email CC (phân cách bằng dấu phẩy)</Label>
                    <Input
                      value={formData.ccRecipients}
                      onChange={(e) => setFormData({ ...formData, ccRecipients: e.target.value })}
                      placeholder="cc1@example.com, cc2@example.com"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Bao gồm biểu đồ</Label>
                    <Switch
                      checked={formData.includeCharts}
                      onCheckedChange={(v) => setFormData({ ...formData, includeCharts: v })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Bao gồm dữ liệu thô</Label>
                    <Switch
                      checked={formData.includeRawData}
                      onCheckedChange={(v) => setFormData({ ...formData, includeRawData: v })}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo báo cáo
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Reports List */}
        <div className="grid gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </>
          ) : reports && reports.length > 0 ? (
            reports.map((report) => (
              <Card key={report.id} className={!report.isActive ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{report.name}</h3>
                        {getStatusBadge(report)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{getReportTypeLabel(report.reportType)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{getScheduleText(report)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{JSON.parse(report.recipients as string || '[]').length} người nhận</span>
                        </div>
                      </div>
                      
                      {report.nextRunAt && report.isActive && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Lần chạy tiếp theo: </span>
                          <span className="font-medium">{new Date(report.nextRunAt).toLocaleString('vi-VN')}</span>
                        </div>
                      )}
                      
                      {report.lastRunAt && (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Lần chạy cuối: </span>
                          <span className={report.lastRunStatus === 'success' ? 'text-green-500' : 'text-red-500'}>
                            {new Date(report.lastRunAt).toLocaleString('vi-VN')}
                            {report.lastRunStatus === 'success' ? ' ✓' : ' ✗'}
                          </span>
                        </div>
                      )}
                      
                      {report.lastRunError && (
                        <div className="mt-1 text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>{report.lastRunError}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendNowMutation.mutate({ id: report.id })}
                        disabled={sendNowMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Gửi ngay
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: report.id })}
                      >
                        {report.isActive ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Tạm dừng
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Kích hoạt
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm('Bạn có chắc muốn xóa báo cáo này?')) {
                            deleteMutation.mutate({ id: report.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Mail className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">Chưa có báo cáo SPC tự động</p>
                <p className="text-sm mb-4">Tạo báo cáo đầu tiên để bắt đầu</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo báo cáo mới
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <MailCheck className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-700 dark:text-blue-400">Hướng dẫn sử dụng</h4>
                <ul className="mt-2 space-y-1 text-sm text-blue-600 dark:text-blue-300">
                  <li>• Báo cáo sẽ được gửi tự động theo lịch đã cấu hình</li>
                  <li>• Có thể gửi báo cáo ngay lập tức bằng nút "Gửi ngay"</li>
                  <li>• Tạm dừng báo cáo khi không cần thiết để tiết kiệm tài nguyên</li>
                  <li>• Đảm bảo cấu hình SMTP đã được thiết lập trong phần Cài đặt</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
