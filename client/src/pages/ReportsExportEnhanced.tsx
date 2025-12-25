/**
 * Reports Export Enhanced Page
 * Task: RPT-01, RPT-02, RPT-03, RPT-04, RPT-05
 * Trang xuất báo cáo nâng cao với template chuyên nghiệp
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  FileText, Download, Calendar as CalendarIcon, Clock, Mail,
  FileSpreadsheet, FileType, FileCode, Plus, Trash2, Edit,
  Play, Pause, RefreshCw, Send, Settings, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Report types
const REPORT_TYPES = [
  { value: "oee", label: "Báo cáo OEE", icon: BarChart3 },
  { value: "maintenance", label: "Báo cáo Bảo trì", icon: Settings },
  { value: "spc", label: "Báo cáo SPC/CPK", icon: BarChart3 },
  { value: "ntf", label: "Báo cáo NTF", icon: FileText },
  { value: "combined", label: "Báo cáo Tổng hợp", icon: FileText },
];

const FORMAT_OPTIONS = [
  { value: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF", icon: FileType },
  { value: "html", label: "HTML", icon: FileCode },
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Hàng ngày" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "monthly", label: "Hàng tháng" },
];

interface ScheduledReport {
  id: number;
  name: string;
  reportType: string;
  format: string;
  schedule: string;
  recipients: string[];
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export default function ReportsExportEnhanced() {
  const [selectedTab, setSelectedTab] = useState("generate");
  const [reportType, setReportType] = useState("oee");
  const [format, setFormat] = useState("excel");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    {
      id: 1,
      name: "Báo cáo OEE hàng tuần",
      reportType: "oee",
      format: "excel",
      schedule: "weekly",
      recipients: ["manager@company.com"],
      enabled: true,
      lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      name: "Báo cáo Bảo trì hàng tháng",
      reportType: "maintenance",
      format: "pdf",
      schedule: "monthly",
      recipients: ["director@company.com", "maintenance@company.com"],
      enabled: true,
      lastRunAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ]);

  // New scheduled report dialog
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    reportType: "oee",
    format: "excel",
    schedule: "weekly",
    recipients: "",
  });

  // Fetch data
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Generate report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Đã tạo báo cáo ${REPORT_TYPES.find(r => r.value === reportType)?.label} thành công!`);
      
      // In production, trigger download
      // window.location.href = `/api/reports/download?type=${reportType}&format=${format}`;
    } catch (error) {
      toast.error("Lỗi khi tạo báo cáo");
    } finally {
      setIsGenerating(false);
    }
  };

  // Add scheduled report
  const handleAddScheduledReport = () => {
    const newReport: ScheduledReport = {
      id: Date.now(),
      name: newSchedule.name,
      reportType: newSchedule.reportType,
      format: newSchedule.format,
      schedule: newSchedule.schedule,
      recipients: newSchedule.recipients.split(",").map(e => e.trim()),
      enabled: true,
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
    
    setScheduledReports([...scheduledReports, newReport]);
    setShowNewScheduleDialog(false);
    setNewSchedule({ name: "", reportType: "oee", format: "excel", schedule: "weekly", recipients: "" });
    toast.success("Đã thêm lịch báo cáo mới");
  };

  // Toggle scheduled report
  const toggleScheduledReport = (id: number) => {
    setScheduledReports(reports =>
      reports.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  };

  // Delete scheduled report
  const deleteScheduledReport = (id: number) => {
    setScheduledReports(reports => reports.filter(r => r.id !== id));
    toast.success("Đã xóa lịch báo cáo");
  };

  // Run scheduled report now
  const runScheduledReportNow = async (report: ScheduledReport) => {
    toast.info(`Đang tạo báo cáo "${report.name}"...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success(`Đã gửi báo cáo "${report.name}" đến ${report.recipients.join(", ")}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Xuất Báo Cáo
            </h1>
            <p className="text-muted-foreground">
              Tạo và lên lịch báo cáo OEE, Bảo trì, SPC/CPK
            </p>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="generate">Tạo Báo Cáo</TabsTrigger>
            <TabsTrigger value="scheduled">Lịch Báo Cáo</TabsTrigger>
            <TabsTrigger value="history">Lịch Sử</TabsTrigger>
          </TabsList>

          {/* Generate Report Tab */}
          <TabsContent value="generate" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Report Configuration */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Cấu hình Báo cáo</CardTitle>
                  <CardDescription>Chọn loại báo cáo và các tùy chọn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Report Type */}
                  <div className="space-y-2">
                    <Label>Loại Báo cáo</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {REPORT_TYPES.map(type => (
                        <Button
                          key={type.value}
                          variant={reportType === type.value ? "default" : "outline"}
                          className="flex flex-col h-auto py-3"
                          onClick={() => setReportType(type.value)}
                        >
                          <type.icon className="h-5 w-5 mb-1" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <Label>Định dạng xuất</Label>
                    <div className="flex gap-2">
                      {FORMAT_OPTIONS.map(fmt => (
                        <Button
                          key={fmt.value}
                          variant={format === fmt.value ? "default" : "outline"}
                          className="flex items-center gap-2"
                          onClick={() => setFormat(fmt.value)}
                        >
                          <fmt.icon className="h-4 w-4" />
                          {fmt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label>Khoảng thời gian</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(dateRange.from, "dd/MM/yyyy", { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.from}
                            onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="flex items-center">đến</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(dateRange.to, "dd/MM/yyyy", { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateRange.to}
                            onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    <Label>Tùy chọn</Label>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeCharts"
                          checked={includeCharts}
                          onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                        />
                        <Label htmlFor="includeCharts" className="cursor-pointer">
                          Bao gồm biểu đồ
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="includeDetails"
                          checked={includeDetails}
                          onCheckedChange={(checked) => setIncludeDetails(!!checked)}
                        />
                        <Label htmlFor="includeDetails" className="cursor-pointer">
                          Bao gồm chi tiết
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Đang tạo báo cáo...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Tạo và Tải Báo cáo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Xem trước</CardTitle>
                  <CardDescription>Nội dung báo cáo sẽ bao gồm</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportType === "oee" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>OEE</Badge>
                          <span className="text-sm">Tổng quan OEE</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• OEE trung bình theo kỳ</li>
                          <li>• Availability, Performance, Quality</li>
                          <li>• OEE theo máy/dây chuyền</li>
                          <li>• Xu hướng OEE theo ngày</li>
                          <li>• Top 5 máy OEE thấp nhất</li>
                        </ul>
                      </div>
                    )}
                    {reportType === "maintenance" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>Bảo trì</Badge>
                          <span className="text-sm">Tổng quan Bảo trì</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• Tổng số Work Orders</li>
                          <li>• MTTR, MTBF trung bình</li>
                          <li>• Chi phí bảo trì</li>
                          <li>• Phân loại theo loại bảo trì</li>
                          <li>• Bảo trì theo máy</li>
                        </ul>
                      </div>
                    )}
                    {reportType === "spc" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>SPC</Badge>
                          <span className="text-sm">Tổng quan SPC/CPK</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• CPK trung bình theo sản phẩm</li>
                          <li>• Xu hướng CPK theo thời gian</li>
                          <li>• Tỷ lệ vi phạm ngưỡng</li>
                          <li>• So sánh CPK theo ca</li>
                        </ul>
                      </div>
                    )}
                    {reportType === "ntf" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>NTF</Badge>
                          <span className="text-sm">Tổng quan NTF</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• Tỷ lệ NTF theo sản phẩm</li>
                          <li>• Phân tích nguyên nhân</li>
                          <li>• Chi phí NTF</li>
                          <li>• Xu hướng NTF theo thời gian</li>
                        </ul>
                      </div>
                    )}
                    {reportType === "combined" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>Tổng hợp</Badge>
                          <span className="text-sm">Báo cáo Tổng hợp</span>
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          <li>• Tất cả nội dung OEE</li>
                          <li>• Tất cả nội dung Bảo trì</li>
                          <li>• Tất cả nội dung SPC/CPK</li>
                          <li>• Tương quan giữa các chỉ số</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduled" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Lịch Báo cáo Tự động</h3>
              <Dialog open={showNewScheduleDialog} onOpenChange={setShowNewScheduleDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Lịch Mới
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm Lịch Báo cáo Mới</DialogTitle>
                    <DialogDescription>
                      Cấu hình báo cáo tự động gửi định kỳ
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tên báo cáo</Label>
                      <Input
                        value={newSchedule.name}
                        onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                        placeholder="VD: Báo cáo OEE hàng tuần"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại báo cáo</Label>
                      <Select
                        value={newSchedule.reportType}
                        onValueChange={(v) => setNewSchedule({ ...newSchedule, reportType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REPORT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Định dạng</Label>
                        <Select
                          value={newSchedule.format}
                          onValueChange={(v) => setNewSchedule({ ...newSchedule, format: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORMAT_OPTIONS.map(fmt => (
                              <SelectItem key={fmt.value} value={fmt.value}>
                                {fmt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tần suất</Label>
                        <Select
                          value={newSchedule.schedule}
                          onValueChange={(v) => setNewSchedule({ ...newSchedule, schedule: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEDULE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Người nhận (email, phân cách bằng dấu phẩy)</Label>
                      <Input
                        value={newSchedule.recipients}
                        onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                        placeholder="email1@company.com, email2@company.com"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewScheduleDialog(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleAddScheduledReport}>
                      Thêm Lịch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {scheduledReports.map(report => (
                <Card key={report.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={report.enabled}
                          onCheckedChange={() => toggleScheduledReport(report.id)}
                        />
                        <div>
                          <div className="font-medium">{report.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline">
                              {REPORT_TYPES.find(t => t.value === report.reportType)?.label}
                            </Badge>
                            <Badge variant="outline">
                              {FORMAT_OPTIONS.find(f => f.value === report.format)?.label}
                            </Badge>
                            <Badge variant="outline">
                              {SCHEDULE_OPTIONS.find(s => s.value === report.schedule)?.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">
                            Gửi đến: {report.recipients.join(", ")}
                          </div>
                          {report.nextRunAt && (
                            <div className="text-muted-foreground">
                              Lần tiếp: {format(report.nextRunAt, "dd/MM/yyyy HH:mm", { locale: vi })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => runScheduledReportNow(report)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteScheduledReport(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {scheduledReports.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Chưa có lịch báo cáo</h3>
                    <p className="text-muted-foreground mb-4">
                      Thêm lịch báo cáo tự động để nhận báo cáo định kỳ qua email
                    </p>
                    <Button onClick={() => setShowNewScheduleDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm Lịch Mới
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Báo cáo</CardTitle>
                <CardDescription>Các báo cáo đã tạo gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { id: 1, name: "Báo cáo OEE tháng 12", type: "oee", format: "excel", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), size: "1.2 MB" },
                    { id: 2, name: "Báo cáo Bảo trì Q4", type: "maintenance", format: "pdf", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), size: "2.5 MB" },
                    { id: 3, name: "Báo cáo SPC tuần 50", type: "spc", format: "excel", createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), size: "0.8 MB" },
                  ].map(report => (
                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {report.format === "excel" ? (
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        ) : (
                          <FilePdf className="h-8 w-8 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">{report.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(report.createdAt, "dd/MM/yyyy HH:mm", { locale: vi })} • {report.size}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Tải lại
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
