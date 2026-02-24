import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  FileText, Download, FileSpreadsheet, Calendar, 
  BarChart3, Wrench, Gauge, RefreshCw, Clock, CheckCircle
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function ReportsExport() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [reportType, setReportType] = useState<"oee" | "maintenance" | "kpi">("oee");
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("csv");

  const { data: machines } = trpc.machine.listAll.useQuery();

  const generateOEEReport = trpc.mmsReport.generateOEEReport.useMutation({
    onSuccess: (data) => {
      if (data.format === "csv") {
        downloadFile(data.data as string, `oee-report-${startDate}-${endDate}.csv`, "text/csv");
        toast.success("Đã xuất báo cáo OEE thành công");
      } else {
        console.log("OEE Report Data:", data);
        toast.success("Đã tạo báo cáo OEE");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const generateMaintenanceReport = trpc.mmsReport.generateMaintenanceReport.useMutation({
    onSuccess: (data) => {
      if (data.format === "csv") {
        downloadFile(data.data as string, `maintenance-report-${startDate}-${endDate}.csv`, "text/csv");
        toast.success("Đã xuất báo cáo Bảo trì thành công");
      } else {
        console.log("Maintenance Report Data:", data);
        toast.success("Đã tạo báo cáo Bảo trì");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const generateKPIReport = trpc.mmsReport.generateKPISummary.useMutation({
    onSuccess: (data) => {
      const jsonStr = JSON.stringify(data, null, 2);
      downloadFile(jsonStr, `kpi-summary-${startDate}-${endDate}.json`, "application/json");
      toast.success("Đã xuất báo cáo KPI thành công");
    },
    onError: (err) => toast.error(err.message),
  });

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    const machineId = selectedMachine !== "all" ? Number(selectedMachine) : undefined;

    switch (reportType) {
      case "oee":
        generateOEEReport.mutate({
          startDate,
          endDate,
          machineId,
          format: exportFormat,
        });
        break;
      case "maintenance":
        generateMaintenanceReport.mutate({
          startDate,
          endDate,
          machineId,
          type: "all",
          format: exportFormat,
        });
        break;
      case "kpi":
        generateKPIReport.mutate({
          startDate,
          endDate,
        });
        break;
    }
  };

  const isLoading = generateOEEReport.isPending || generateMaintenanceReport.isPending || generateKPIReport.isPending;

  // Quick period selectors
  const setPeriod = (days: number) => {
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setStartDate(format(subDays(new Date(), days), "yyyy-MM-dd"));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo & Xuất dữ liệu</h1>
            <p className="text-muted-foreground">
              Tạo và xuất báo cáo OEE, Bảo trì theo định kỳ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cấu hình Báo cáo</CardTitle>
              <CardDescription>Chọn loại báo cáo và khoảng thời gian</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Type */}
              <div className="space-y-2">
                <Label>Loại báo cáo</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={reportType === "oee" ? "default" : "outline"}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setReportType("oee")}
                  >
                    <Gauge className="h-6 w-6" />
                    <span>OEE</span>
                  </Button>
                  <Button
                    variant={reportType === "maintenance" ? "default" : "outline"}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setReportType("maintenance")}
                  >
                    <Wrench className="h-6 w-6" />
                    <span>Bảo trì</span>
                  </Button>
                  <Button
                    variant={reportType === "kpi" ? "default" : "outline"}
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setReportType("kpi")}
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>KPI Tổng hợp</span>
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Khoảng thời gian</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button variant="outline" size="sm" onClick={() => setPeriod(7)}>7 ngày</Button>
                  <Button variant="outline" size="sm" onClick={() => setPeriod(30)}>30 ngày</Button>
                  <Button variant="outline" size="sm" onClick={() => setPeriod(90)}>90 ngày</Button>
                  <Button variant="outline" size="sm" onClick={() => setPeriod(365)}>1 năm</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Từ ngày</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Đến ngày</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Machine Filter */}
              {reportType !== "kpi" && (
                <div className="space-y-2">
                  <Label>Máy</Label>
                  <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả máy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả máy</SelectItem>
                      {machines?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Export Format */}
              {reportType !== "kpi" && (
                <div className="space-y-2">
                  <Label>Định dạng xuất</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={exportFormat === "csv" ? "default" : "outline"}
                      onClick={() => setExportFormat("csv")}
                      className="flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV (Excel)
                    </Button>
                    <Button
                      variant={exportFormat === "json" ? "default" : "outline"}
                      onClick={() => setExportFormat("json")}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      JSON
                    </Button>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleGenerateReport}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo báo cáo...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Tạo & Tải báo cáo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Report Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin báo cáo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportType === "oee" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Báo cáo OEE</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Bao gồm các chỉ số OEE, Availability, Performance, Quality theo ngày và máy.
                  </p>
                  <div className="text-sm space-y-1">
                    <p><strong>Các cột dữ liệu:</strong></p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>ID, Máy, Ngày</li>
                      <li>Availability, Performance, Quality</li>
                      <li>OEE tổng hợp</li>
                    </ul>
                  </div>
                </div>
              )}

              {reportType === "maintenance" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Báo cáo Bảo trì</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Chi tiết các công việc bảo trì, trạng thái hoàn thành, thời gian thực hiện.
                  </p>
                  <div className="text-sm space-y-1">
                    <p><strong>Các cột dữ liệu:</strong></p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>ID, Máy, Tiêu đề</li>
                      <li>Loại, Ưu tiên, Trạng thái</li>
                      <li>Ngày lên lịch, Ngày hoàn thành</li>
                    </ul>
                  </div>
                </div>
              )}

              {reportType === "kpi" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Báo cáo KPI Tổng hợp</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tổng hợp các chỉ số KPI chính của nhà máy trong khoảng thời gian.
                  </p>
                  <div className="text-sm space-y-1">
                    <p><strong>Nội dung:</strong></p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>OEE trung bình và các thành phần</li>
                      <li>Thống kê bảo trì (hoàn thành, định kỳ)</li>
                      <li>Tỷ lệ hoàn thành công việc</li>
                      <li>Số lượng máy móc</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  <strong>Lưu ý:</strong> Báo cáo CSV có thể mở trực tiếp bằng Excel. 
                  Báo cáo JSON phù hợp cho tích hợp với các hệ thống khác.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo định kỳ</CardTitle>
            <CardDescription>Cấu hình báo cáo tự động gửi qua email</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên báo cáo</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tần suất</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Lần gửi gần nhất</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Báo cáo OEE hàng tuần</TableCell>
                  <TableCell><Badge variant="outline">OEE</Badge></TableCell>
                  <TableCell>Hàng tuần (Thứ 2)</TableCell>
                  <TableCell>manager@company.com</TableCell>
                  <TableCell><Badge className="bg-green-500">Hoạt động</Badge></TableCell>
                  <TableCell className="text-muted-foreground">16/12/2024 08:00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Báo cáo Bảo trì hàng tháng</TableCell>
                  <TableCell><Badge variant="outline">Bảo trì</Badge></TableCell>
                  <TableCell>Hàng tháng (Ngày 1)</TableCell>
                  <TableCell>maintenance@company.com</TableCell>
                  <TableCell><Badge className="bg-green-500">Hoạt động</Badge></TableCell>
                  <TableCell className="text-muted-foreground">01/12/2024 08:00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">KPI Dashboard hàng ngày</TableCell>
                  <TableCell><Badge variant="outline">KPI</Badge></TableCell>
                  <TableCell>Hàng ngày (06:00)</TableCell>
                  <TableCell>director@company.com</TableCell>
                  <TableCell><Badge variant="secondary">Tạm dừng</Badge></TableCell>
                  <TableCell className="text-muted-foreground">15/12/2024 06:00</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
                <Calendar className="h-4 w-4 mr-2" />
                Cấu hình báo cáo định kỳ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
