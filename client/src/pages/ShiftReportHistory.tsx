import { useState } from "react";
import { createSafeHtml } from "@/lib/sanitize";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Clock,
  Mail,
  MailCheck,
  MailX,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Send,
  Gauge,
  Target,
  AlertTriangle
} from "lucide-react";

const SHIFT_INFO = {
  morning: { name: "Ca sáng", icon: Sun, color: "text-yellow-500", time: "06:00 - 14:00" },
  afternoon: { name: "Ca chiều", icon: Sunset, color: "text-orange-500", time: "14:00 - 22:00" },
  night: { name: "Ca đêm", icon: Moon, color: "text-blue-500", time: "22:00 - 06:00" }
};

export default function ShiftReportHistory() {
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Fetch shift reports
  const { data: reports, isLoading, refetch } = trpc.shiftReport.list.useQuery({
    limit: 50,
    shiftType: shiftFilter !== "all" ? shiftFilter as any : undefined
  });

  // Generate report mutation
  const generateMutation = trpc.shiftReport.generate.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // Send email mutation
  const sendEmailMutation = trpc.shiftReport.sendEmail.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500"><MailCheck className="h-3 w-3 mr-1" /> Đã gửi</Badge>;
      case "failed":
        return <Badge variant="destructive"><MailX className="h-3 w-3 mr-1" /> Thất bại</Badge>;
      default:
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" /> Đã tạo</Badge>;
    }
  };

  const getShiftIcon = (shiftType: string) => {
    const shift = SHIFT_INFO[shiftType as keyof typeof SHIFT_INFO];
    if (!shift) return <Clock className="h-4 w-4" />;
    const Icon = shift.icon;
    return <Icon className={`h-4 w-4 ${shift.color}`} />;
  };

  const getOEEColor = (oee: number | null) => {
    if (!oee) return "text-muted-foreground";
    if (oee >= 85) return "text-green-500";
    if (oee >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getCPKColor = (cpk: number | null) => {
    if (!cpk) return "text-muted-foreground";
    if (cpk >= 1.33) return "text-green-500";
    if (cpk >= 1.0) return "text-yellow-500";
    return "text-red-500";
  };

  // Generate report for current shift
  const handleGenerateReport = () => {
    const now = new Date();
    const hour = now.getHours();
    let shiftType: "morning" | "afternoon" | "night" = "morning";
    if (hour >= 14 && hour < 22) shiftType = "afternoon";
    else if (hour >= 22 || hour < 6) shiftType = "night";

    generateMutation.mutate({
      shiftDate: now.toISOString(),
      shiftType
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lịch sử Báo cáo Shift</h1>
            <p className="text-muted-foreground">Xem và quản lý báo cáo tự động theo ca làm việc</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleGenerateReport}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Tạo báo cáo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo ca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ca</SelectItem>
                  <SelectItem value="morning">Ca sáng</SelectItem>
                  <SelectItem value="afternoon">Ca chiều</SelectItem>
                  <SelectItem value="night">Ca đêm</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng báo cáo</p>
                  <p className="text-2xl font-bold">{reports?.length || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã gửi</p>
                  <p className="text-2xl font-bold text-green-500">
                    {reports?.filter((r: any) => r.status === "sent").length || 0}
                  </p>
                </div>
                <MailCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ gửi</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {reports?.filter((r: any) => r.status === "generated").length || 0}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thất bại</p>
                  <p className="text-2xl font-bold text-red-500">
                    {reports?.filter((r: any) => r.status === "failed").length || 0}
                  </p>
                </div>
                <MailX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Danh sách báo cáo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Ngày</th>
                    <th className="text-left py-3 px-4">Ca</th>
                    <th className="text-right py-3 px-4">OEE</th>
                    <th className="text-right py-3 px-4">CPK</th>
                    <th className="text-right py-3 px-4">Sản xuất</th>
                    <th className="text-right py-3 px-4">Cảnh báo</th>
                    <th className="text-center py-3 px-4">Trạng thái</th>
                    <th className="text-right py-3 px-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.map((report: any) => {
                    const shiftInfo = SHIFT_INFO[report.shiftType as keyof typeof SHIFT_INFO];
                    return (
                      <tr key={report.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(report.shiftDate).toLocaleDateString('vi-VN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getShiftIcon(report.shiftType)}
                            <span>{shiftInfo?.name || report.shiftType}</span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${getOEEColor(Number(report.oee))}`}>
                          {report.oee ? `${Number(report.oee).toFixed(1)}%` : "N/A"}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${getCPKColor(Number(report.cpk))}`}>
                          {report.cpk ? Number(report.cpk).toFixed(3) : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {report.totalProduced?.toLocaleString() || 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(report.alertCount || 0) + (report.spcViolationCount || 0) > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {(report.alertCount || 0) + (report.spcViolationCount || 0)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedReport(report)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Báo cáo {shiftInfo?.name} - {new Date(report.shiftDate).toLocaleDateString('vi-VN')}
                                  </DialogTitle>
                                </DialogHeader>
                                <div 
                                  className="mt-4"
                                  dangerouslySetInnerHTML={createSafeHtml(report.reportContent || '')}
                                />
                              </DialogContent>
                            </Dialog>
                            {report.status !== "sent" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendEmailMutation.mutate({
                                  reportId: report.id,
                                  recipients: ["admin@example.com"]
                                })}
                                disabled={sendEmailMutation.isPending}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(!reports || reports.length === 0) && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có báo cáo nào</p>
                <Button className="mt-4" onClick={handleGenerateReport}>
                  Tạo báo cáo đầu tiên
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
