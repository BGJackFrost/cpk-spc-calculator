import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  Wrench,
  Target,
  Timer,
  CheckCircle,
  XCircle,
  FileText,
  FileSpreadsheet,
  File,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Chart components
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function MttrMtbfReport() {
  const [targetType, setTargetType] = useState<"device" | "machine" | "production_line">("machine");
  const [targetId, setTargetId] = useState<number>(1);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch summary report
  const { data: reportData, isLoading, refetch } = trpc.mttrMtbf.getSummaryReport.useQuery(
    {
      targetType,
      targetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    {
      enabled: !!targetId,
    }
  );

  // Fetch failure events
  const { data: failureEvents } = trpc.mttrMtbf.getFailureEvents.useQuery({
    targetType,
    targetId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    limit: 50,
  });

  // Calculate mutation
  const calculateMutation = trpc.mttrMtbf.calculate.useMutation({
    onSuccess: () => {
      toast.success("Đã tính toán và lưu thống kê MTTR/MTBF");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleCalculate = () => {
    calculateMutation.mutate({
      targetType,
      targetId,
      periodType: "monthly",
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
    });
  };

  // Export mutations
  const exportExcelMutation = trpc.mttrMtbf.exportExcel.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo Excel thành công!');
    },
    onError: (error) => {
      toast.error(`Lỗi xuất Excel: ${error.message}`);
    },
  });

  const exportPdfMutation = trpc.mttrMtbf.exportPdf.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo PDF thành công!');
    },
    onError: (error) => {
      toast.error(`Lỗi xuất PDF: ${error.message}`);
    },
  });

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      targetType,
      targetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetName: `${targetType === 'device' ? 'Thiết bị' : targetType === 'machine' ? 'Máy móc' : 'Dây chuyền'} #${targetId}`,
    });
  };

  const handleExportPdf = () => {
    exportPdfMutation.mutate({
      targetType,
      targetId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      targetName: `${targetType === 'device' ? 'Thiết bị' : targetType === 'machine' ? 'Máy móc' : 'Dây chuyền'} #${targetId}`,
    });
  };

  // Format time duration
  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes.toFixed(0)} phút`;
    if (minutes < 1440) return `${(minutes / 60).toFixed(1)} giờ`;
    return `${(minutes / 1440).toFixed(1)} ngày`;
  };

  const formatHours = (hours: number | null | undefined) => {
    if (!hours) return "N/A";
    if (hours < 24) return `${hours.toFixed(1)} giờ`;
    return `${(hours / 24).toFixed(1)} ngày`;
  };

  // Prepare chart data
  const trendData = useMemo(() => {
    if (!reportData?.historicalStats) return [];
    return reportData.historicalStats.map((stat: any) => ({
      period: new Date(stat.period_start).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
      }),
      mttr: Number(stat.mttr) || 0,
      mtbf: Number(stat.mtbf) || 0,
      availability: (Number(stat.availability) || 0) * 100,
    }));
  }, [reportData]);

  const workOrderPieData = useMemo(() => {
    if (!reportData?.current) return [];
    const { correctiveWorkOrders, preventiveWorkOrders, predictiveWorkOrders, emergencyWorkOrders } = reportData.current;
    return [
      { name: "Corrective", value: correctiveWorkOrders || 0 },
      { name: "Preventive", value: preventiveWorkOrders || 0 },
      { name: "Predictive", value: predictiveWorkOrders || 0 },
      { name: "Emergency", value: emergencyWorkOrders || 0 },
    ].filter(d => d.value > 0);
  }, [reportData]);

  const failureByTypeData = useMemo(() => {
    if (!failureEvents) return [];
    const counts: Record<string, number> = {};
    failureEvents.forEach((event: any) => {
      const type = event.failure_type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [failureEvents]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Báo cáo MTTR/MTBF
            </h1>
            <p className="text-muted-foreground">
              Phân tích Mean Time To Repair và Mean Time Between Failures cho maintenance work orders
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCalculate}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              Tính toán
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  disabled={exportExcelMutation.isPending || exportPdfMutation.isPending}
                >
                  {(exportExcelMutation.isPending || exportPdfMutation.isPending) ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Xuất báo cáo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Xuất Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <File className="w-4 h-4 mr-2" />
                  Xuất PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-40">
                <Label>Loại đối tượng</Label>
                <Select
                  value={targetType}
                  onValueChange={(v: any) => setTargetType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device">Thiết bị IoT</SelectItem>
                    <SelectItem value="machine">Máy móc</SelectItem>
                    <SelectItem value="production_line">Dây chuyền</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>ID đối tượng</Label>
                <Input
                  type="number"
                  value={targetId}
                  onChange={(e) => setTargetId(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="w-40">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Xem báo cáo
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    MTTR
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(reportData?.current?.mttr)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mean Time To Repair
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    MTBF
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatHours(reportData?.current?.mtbf)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mean Time Between Failures
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData?.current?.availability
                      ? `${(reportData.current.availability * 100).toFixed(1)}%`
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tỷ lệ khả dụng
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Tổng sự cố
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData?.current?.totalFailures || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Trong kỳ báo cáo
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="trends">Xu hướng</TabsTrigger>
                <TabsTrigger value="failures">Sự cố</TabsTrigger>
                <TabsTrigger value="workorders">Work Orders</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MTTR/MTBF Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Chi tiết MTTR/MTBF</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">MTTR Trung bình</TableCell>
                            <TableCell>{formatDuration(reportData?.current?.mttr)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">MTTR Min</TableCell>
                            <TableCell>{formatDuration(reportData?.current?.mttrMin)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">MTTR Max</TableCell>
                            <TableCell>{formatDuration(reportData?.current?.mttrMax)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">MTBF Trung bình</TableCell>
                            <TableCell>{formatHours(reportData?.current?.mtbf)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">MTBF Min</TableCell>
                            <TableCell>{formatHours(reportData?.current?.mtbfMin)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">MTBF Max</TableCell>
                            <TableCell>{formatHours(reportData?.current?.mtbfMax)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Downtime Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Tổng kết Downtime</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Tổng downtime</TableCell>
                            <TableCell>
                              {formatDuration(reportData?.current?.totalDowntimeMinutes)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Tổng uptime</TableCell>
                            <TableCell>
                              {formatHours(reportData?.current?.totalUptimeHours)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Số lần sửa chữa</TableCell>
                            <TableCell>{reportData?.current?.totalRepairs || 0}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Chi phí nhân công</TableCell>
                            <TableCell>
                              {reportData?.current?.totalLaborCost
                                ? `${reportData.current.totalLaborCost.toLocaleString()} VNĐ`
                                : "N/A"}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Work Order Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Phân bố Work Order theo loại</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {workOrderPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={workOrderPieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {workOrderPieData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Không có dữ liệu work order
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Xu hướng MTTR/MTBF theo thời gian</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="mttr"
                              stroke="#3b82f6"
                              name="MTTR (phút)"
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="mtbf"
                              stroke="#10b981"
                              name="MTBF (giờ)"
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="availability"
                              stroke="#f59e0b"
                              name="Availability (%)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Không có dữ liệu xu hướng
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Failures Tab */}
              <TabsContent value="failures" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Danh sách sự cố</CardTitle>
                    <CardDescription>
                      Các sự cố được ghi nhận trong kỳ báo cáo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Mức độ</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead>Downtime</TableHead>
                          <TableHead>Repair Time</TableHead>
                          <TableHead>Nguyên nhân</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failureEvents && failureEvents.length > 0 ? (
                          failureEvents.map((event: any) => (
                            <TableRow key={event.id}>
                              <TableCell>
                                {new Date(event.failure_start_at).toLocaleString("vi-VN")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{event.failure_type}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    event.severity === "critical"
                                      ? "destructive"
                                      : event.severity === "major"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {event.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {event.description || "N/A"}
                              </TableCell>
                              <TableCell>
                                {formatDuration(event.downtime_duration)}
                              </TableCell>
                              <TableCell>
                                {formatDuration(event.repair_duration)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {event.root_cause_category || "unknown"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              Không có sự cố nào trong kỳ báo cáo
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Failure by Type Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Phân bố sự cố theo loại</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {failureByTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={failureByTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" name="Số lượng" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          Không có dữ liệu sự cố
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Work Orders Tab */}
              <TabsContent value="workorders" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Corrective
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {reportData?.current?.correctiveWorkOrders || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Sửa chữa khắc phục</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Preventive
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {reportData?.current?.preventiveWorkOrders || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Bảo trì phòng ngừa</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Predictive
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">
                        {reportData?.current?.predictiveWorkOrders || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Bảo trì dự đoán</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Emergency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {reportData?.current?.emergencyWorkOrders || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">Khẩn cấp</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tổng chi phí bảo trì</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {reportData?.current?.totalLaborCost
                        ? `${reportData.current.totalLaborCost.toLocaleString()} VNĐ`
                        : "0 VNĐ"}
                    </div>
                    <p className="text-muted-foreground">
                      Tổng chi phí nhân công trong kỳ báo cáo
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Giải thích các chỉ số
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>MTTR (Mean Time To Repair):</strong> Thời gian trung bình để sửa chữa một sự cố.
              Giá trị thấp hơn cho thấy khả năng phản ứng và sửa chữa nhanh hơn.
            </p>
            <p>
              <strong>MTBF (Mean Time Between Failures):</strong> Thời gian trung bình giữa các lần hỏng.
              Giá trị cao hơn cho thấy thiết bị đáng tin cậy hơn.
            </p>
            <p>
              <strong>Availability:</strong> Tỷ lệ thời gian thiết bị sẵn sàng hoạt động.
              Tính bằng công thức: MTBF / (MTBF + MTTR)
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
