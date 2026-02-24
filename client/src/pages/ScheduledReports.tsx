import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Plus, Mail, Calendar, Clock, FileText, Trash2, Edit, 
  Play, Pause, History, CheckCircle, XCircle, AlertCircle,
  Send, Settings, BarChart3, Wrench
} from "lucide-react";

const REPORT_TYPES = [
  { value: "oee_daily", label: "OEE Hàng ngày", icon: BarChart3 },
  { value: "oee_weekly", label: "OEE Hàng tuần", icon: BarChart3 },
  { value: "oee_monthly", label: "OEE Hàng tháng", icon: BarChart3 },
  { value: "maintenance_daily", label: "Bảo trì Hàng ngày", icon: Wrench },
  { value: "maintenance_weekly", label: "Bảo trì Hàng tuần", icon: Wrench },
  { value: "maintenance_monthly", label: "Bảo trì Hàng tháng", icon: Wrench },
  { value: "combined_weekly", label: "Tổng hợp Hàng tuần", icon: FileText },
  { value: "combined_monthly", label: "Tổng hợp Hàng tháng", icon: FileText },
];

const SCHEDULES = [
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

export default function ScheduledReports() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [formData, setFormData] = useState({
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
  });

  // Queries
  const { data: reports, refetch } = trpc.mmsDashboardConfig.listScheduledReports.useQuery();
  const { data: reportLogs } = trpc.mmsDashboardConfig.getReportLogs.useQuery(
    { reportId: selectedReport! },
    { enabled: !!selectedReport }
  );

  // Mutations
  const createReport = trpc.mmsDashboardConfig.createScheduledReport.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateReport = trpc.mmsDashboardConfig.updateScheduledReport.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteReport = trpc.mmsDashboardConfig.deleteScheduledReport.useMutation({
    onSuccess: () => refetch(),
  });

  const resetForm = () => {
    setFormData({
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
    });
  };

  const handleCreate = () => {
    createReport.mutate({
      name: formData.name,
      reportType: formData.reportType as any,
      frequency: formData.schedule as any,
      dayOfWeek: formData.schedule === "weekly" ? formData.dayOfWeek : undefined,
      dayOfMonth: formData.schedule === "monthly" ? formData.dayOfMonth : undefined,
      timeOfDay: formData.hour ? `${formData.hour.toString().padStart(2, '0')}:00` : '08:00',
      recipients: formData.recipients,
      includeCharts: formData.includeCharts,
      includeTrends: formData.includeTables,
      includeAlerts: formData.includeRecommendations,
    });
  };

  const toggleActive = (id: number, currentStatus: number) => {
    updateReport.mutate({ id, isActive: currentStatus !== 1 });
  };

  const formatSchedule = (report: any) => {
    if (report.schedule === "daily") {
      return `Hàng ngày lúc ${report.hour}:00`;
    } else if (report.schedule === "weekly") {
      const day = DAYS_OF_WEEK.find(d => d.value === report.dayOfWeek)?.label || "";
      return `${day} lúc ${report.hour}:00`;
    } else {
      return `Ngày ${report.dayOfMonth} hàng tháng lúc ${report.hour}:00`;
    }
  };

  const getReportTypeInfo = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type) || { label: type, icon: FileText };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo Tự động</h1>
            <p className="text-muted-foreground">
              Cấu hình gửi báo cáo OEE và Bảo trì định kỳ qua email
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo báo cáo mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tạo Báo cáo Tự động</DialogTitle>
                <DialogDescription>
                  Cấu hình báo cáo sẽ được gửi định kỳ qua email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tên báo cáo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Báo cáo OEE tuần"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Loại báo cáo</Label>
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
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tần suất</Label>
                    <Select
                      value={formData.schedule}
                      onValueChange={(v) => setFormData({ ...formData, schedule: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.schedule === "weekly" && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <Select
                        value={formData.dayOfWeek.toString()}
                        onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((d) => (
                            <SelectItem key={d.value} value={d.value.toString()}>
                              {d.label}
                            </SelectItem>
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
                        onValueChange={(v) => setFormData({ ...formData, dayOfMonth: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <SelectItem key={d} value={d.toString()}>
                              Ngày {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Giờ gửi</Label>
                  <Select
                    value={formData.hour.toString()}
                    onValueChange={(v) => setFormData({ ...formData, hour: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email người nhận (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    placeholder="email1@company.com, email2@company.com"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Nội dung báo cáo</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bao gồm biểu đồ</span>
                    <Switch
                      checked={formData.includeCharts}
                      onCheckedChange={(v) => setFormData({ ...formData, includeCharts: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bao gồm bảng số liệu</span>
                    <Switch
                      checked={formData.includeTables}
                      onCheckedChange={(v) => setFormData({ ...formData, includeTables: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Bao gồm khuyến nghị</span>
                    <Switch
                      checked={formData.includeRecommendations}
                      onCheckedChange={(v) => setFormData({ ...formData, includeRecommendations: v })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name || !formData.recipients}>
                  Tạo báo cáo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports List */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="logs">Lịch sử gửi</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {reports?.filter(r => r.isActive === 1).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có báo cáo tự động nào đang hoạt động</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo báo cáo đầu tiên
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên báo cáo</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Lịch gửi</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Lần gửi tiếp theo</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports?.filter(r => r.isActive === 1).map((report) => {
                        const typeInfo = getReportTypeInfo(report.reportType);
                        return (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <typeInfo.icon className="h-4 w-4 text-muted-foreground" />
                                {typeInfo.label}
                              </div>
                            </TableCell>
                            <TableCell>{formatSchedule(report)}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {report.recipients.split(',').length} người nhận
                              </span>
                            </TableCell>
                            <TableCell>
                              {report.timeOfDay || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.isActive === 1 ? "default" : "secondary"}>
                                {report.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedReport(report.id)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleActive(report.id, report.isActive)}
                                >
                                  {report.isActive === 1 ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => deleteReport.mutate({ id: report.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên báo cáo</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Lịch gửi</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Lần gửi cuối</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports?.map((report) => {
                      const typeInfo = getReportTypeInfo(report.reportType);
                      return (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <typeInfo.icon className="h-4 w-4 text-muted-foreground" />
                              {typeInfo.label}
                            </div>
                          </TableCell>
                          <TableCell>{formatSchedule(report)}</TableCell>
                          <TableCell>
                            <Badge variant={report.isActive === 1 ? "default" : "secondary"}>
                              {report.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.lastSentAt 
                              ? new Date(report.lastSentAt).toLocaleString('vi-VN')
                              : 'Chưa gửi'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleActive(report.id, report.isActive)}
                              >
                                {report.isActive === 1 ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteReport.mutate({ id: report.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gửi báo cáo</CardTitle>
                <CardDescription>
                  {selectedReport 
                    ? `Hiển thị lịch sử của báo cáo #${selectedReport}`
                    : "Chọn một báo cáo để xem lịch sử"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedReport ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nhấn vào biểu tượng lịch sử của một báo cáo để xem chi tiết</p>
                  </div>
                ) : reportLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có lịch sử gửi báo cáo</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Chi tiết</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportLogs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.sentAt).toLocaleString('vi-VN')}
                          </TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Thành công
                              </Badge>
                            ) : log.status === 'partial' ? (
                              <Badge className="bg-yellow-500">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Một phần
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Thất bại
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.successCount}/{log.recipientCount} người nhận
                          </TableCell>
                          <TableCell>
                            {log.errorMessage && (
                              <span className="text-sm text-destructive">{log.errorMessage}</span>
                            )}
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
      </div>
    </DashboardLayout>
  );
}
