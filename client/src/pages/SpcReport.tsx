import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { DateRange } from "react-day-picker";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/DateRangePicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  Sun,
  Sunset,
  Moon,
  FileSpreadsheet,
  FileDown
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart,
} from "recharts";

export default function SpcReport() {
  const { t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  
  // Initialize with last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { from: startDate, to: endDate };
  });

  // Calculate days for trend query
  const days = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 30;
    return Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  }, [dateRange]);

  // Fetch CPK trend data
  const { data: cpkTrend, isLoading: trendLoading, refetch: refetchTrend } = trpc.report.getCpkTrend.useQuery({
    days,
  });

  // Fetch SPC report
  const startDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = dateRange?.to || new Date();
  const { data: spcReport, isLoading: reportLoading, refetch: refetchReport } = trpc.report.getSpcReport.useQuery({
    startDate,
    endDate,
  });

  const handleRefresh = () => {
    refetchTrend();
    refetchReport();
    toast.success(t.common?.refresh || "Đã làm mới dữ liệu báo cáo");
  };

  // Export Excel mutation
  const exportExcelMutation = trpc.report.exportExcel.useMutation({
    onSuccess: (result) => {
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(result.data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Ngày
        { wch: 15 }, // Mã sản phẩm
        { wch: 20 }, // Trạm
        { wch: 10 }, // Số mẫu
        { wch: 12 }, // Mean
        { wch: 12 }, // Std Dev
        { wch: 10 }, // Cp
        { wch: 10 }, // Cpk
        { wch: 12 }, // UCL
        { wch: 12 }, // LCL
        { wch: 10 }, // USL
        { wch: 10 }, // LSL
        { wch: 10 }, // Cảnh báo
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Báo cáo SPC");
      
      // Download file
      const fileName = `bao-cao-spc-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(t.export?.exportSuccess || "Xuất Excel thành công!");
    },
    onError: (error) => {
      toast.error((t.export?.exportError || "Lỗi xuất Excel") + ": " + error.message);
    },
  });

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportExcelMutation.mutateAsync({
        startDate,
        endDate: new Date(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF with charts mutation
  const exportPdfMutation = trpc.report.exportPdfWithCharts.useMutation({
    onSuccess: (result) => {
      // Open PDF in new tab
      window.open(result.url, '_blank');
      toast.success("Xuất PDF thành công! Đang mở file...");
    },
    onError: (error) => {
      toast.error("Lỗi xuất PDF: " + error.message);
    },
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportPdfMutation.mutateAsync({
        startDate,
        endDate,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { label: "Xuất sắc", color: "text-green-600", bg: "bg-green-100" };
    if (cpk >= 1.33) return { label: "Tốt", color: "text-blue-600", bg: "bg-blue-100" };
    if (cpk >= 1.0) return { label: "Chấp nhận", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Cần cải tiến", color: "text-red-600", bg: "bg-red-100" };
  };

  const isLoading = trendLoading || reportLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Báo cáo Tổng hợp SPC</h1>
            <p className="text-muted-foreground mt-1">
              Phân tích xu hướng CPK và thống kê theo ca làm việc
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Xuất Excel
            </Button>
            <Button variant="default" size="sm" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
              Xuất PDF
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Khoảng thời gian:
              </Label>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                showPresets={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {spcReport && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số mẫu</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{spcReport.summary.totalSamples}</div>
                <p className="text-xs text-muted-foreground">
                  Trong {days} ngày qua
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPK Trung bình</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getCpkStatus(spcReport.summary.avgCpk).color}`}>
                  {spcReport.summary.avgCpk.toFixed(3)}
                </div>
                <Badge className={`${getCpkStatus(spcReport.summary.avgCpk).bg} ${getCpkStatus(spcReport.summary.avgCpk).color} mt-1`}>
                  {getCpkStatus(spcReport.summary.avgCpk).label}
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vi phạm CPK</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{spcReport.summary.violationCount}</div>
                <p className="text-xs text-muted-foreground">
                  CPK &lt; 1.0 cần cải tiến
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card rounded-xl border border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đạt chuẩn</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{spcReport.summary.goodCount}</div>
                <p className="text-xs text-muted-foreground">
                  CPK ≥ 1.33 đạt chuẩn
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CPK Trend Chart */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Xu hướng CPK theo ngày
            </CardTitle>
            <CardDescription>
              Biểu đồ thể hiện CPK trung bình, min, max theo từng ngày
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : cpkTrend && cpkTrend.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cpkTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      formatter={(value: number, name: string) => [
                        value.toFixed(3),
                        name === 'avgCpk' ? 'CPK TB' : name === 'minCpk' ? 'CPK Min' : 'CPK Max'
                      ]}
                    />
                    <Legend />
                    <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'CPK=1.33', position: 'right', fontSize: 10 }} />
                    <ReferenceLine y={1.0} stroke="#eab308" strokeDasharray="5 5" label={{ value: 'CPK=1.0', position: 'right', fontSize: 10 }} />
                    <Area type="monotone" dataKey="maxCpk" stackId="1" stroke="#93c5fd" fill="#dbeafe" name="CPK Max" />
                    <Area type="monotone" dataKey="avgCpk" stackId="2" stroke="#3b82f6" fill="#93c5fd" name="CPK TB" />
                    <Line type="monotone" dataKey="minCpk" stroke="#ef4444" strokeWidth={2} dot={false} name="CPK Min" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Chưa có dữ liệu trong khoảng thời gian này</p>
                <p className="text-sm">Thực hiện phân tích SPC để có dữ liệu báo cáo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift Statistics */}
        {spcReport && (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Thống kê theo Ca làm việc
              </CardTitle>
              <CardDescription>
                So sánh CPK trung bình giữa các ca: Sáng (6h-14h), Chiều (14h-22h), Tối (22h-6h)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Morning Shift */}
                <Card className="bg-yellow-50/50 border-yellow-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Sun className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Ca Sáng</h3>
                        <p className="text-xs text-muted-foreground">6:00 - 14:00</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Số mẫu:</span>
                        <span className="font-medium">{spcReport.shiftStats.morning.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CPK TB:</span>
                        <span className={`font-bold ${getCpkStatus(spcReport.shiftStats.morning.avgCpk).color}`}>
                          {spcReport.shiftStats.morning.avgCpk.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Afternoon Shift */}
                <Card className="bg-orange-50/50 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Sunset className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Ca Chiều</h3>
                        <p className="text-xs text-muted-foreground">14:00 - 22:00</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Số mẫu:</span>
                        <span className="font-medium">{spcReport.shiftStats.afternoon.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CPK TB:</span>
                        <span className={`font-bold ${getCpkStatus(spcReport.shiftStats.afternoon.avgCpk).color}`}>
                          {spcReport.shiftStats.afternoon.avgCpk.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Night Shift */}
                <Card className="bg-indigo-50/50 border-indigo-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Moon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Ca Tối</h3>
                        <p className="text-xs text-muted-foreground">22:00 - 6:00</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Số mẫu:</span>
                        <span className="font-medium">{spcReport.shiftStats.night.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CPK TB:</span>
                        <span className={`font-bold ${getCpkStatus(spcReport.shiftStats.night.avgCpk).color}`}>
                          {spcReport.shiftStats.night.avgCpk.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Shift Comparison Bar Chart */}
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Ca Sáng', cpk: spcReport.shiftStats.morning.avgCpk, count: spcReport.shiftStats.morning.count },
                      { name: 'Ca Chiều', cpk: spcReport.shiftStats.afternoon.avgCpk, count: spcReport.shiftStats.afternoon.count },
                      { name: 'Ca Tối', cpk: spcReport.shiftStats.night.avgCpk, count: spcReport.shiftStats.night.count },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine yAxisId="left" y={1.33} stroke="#22c55e" strokeDasharray="5 5" />
                    <Bar yAxisId="left" dataKey="cpk" fill="#3b82f6" name="CPK TB" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="count" fill="#22c55e" name="Số mẫu" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CPK Distribution */}
        {spcReport && (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Phân bổ CPK
              </CardTitle>
              <CardDescription>
                Tỷ lệ phân bổ các mức CPK trong khoảng thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700">Cần cải tiến (CPK &lt; 1.0)</span>
                    <span className="text-2xl font-bold text-red-600">{spcReport.summary.violationCount}</span>
                  </div>
                  <div className="mt-2 h-2 bg-red-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${spcReport.summary.totalSamples > 0 ? (spcReport.summary.violationCount / spcReport.summary.totalSamples) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    {spcReport.summary.totalSamples > 0 ? ((spcReport.summary.violationCount / spcReport.summary.totalSamples) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-700">Chấp nhận (1.0 ≤ CPK &lt; 1.33)</span>
                    <span className="text-2xl font-bold text-yellow-600">{spcReport.summary.warningCount}</span>
                  </div>
                  <div className="mt-2 h-2 bg-yellow-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${spcReport.summary.totalSamples > 0 ? (spcReport.summary.warningCount / spcReport.summary.totalSamples) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    {spcReport.summary.totalSamples > 0 ? ((spcReport.summary.warningCount / spcReport.summary.totalSamples) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">Đạt chuẩn (CPK ≥ 1.33)</span>
                    <span className="text-2xl font-bold text-green-600">{spcReport.summary.goodCount}</span>
                  </div>
                  <div className="mt-2 h-2 bg-green-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${spcReport.summary.totalSamples > 0 ? (spcReport.summary.goodCount / spcReport.summary.totalSamples) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {spcReport.summary.totalSamples > 0 ? ((spcReport.summary.goodCount / spcReport.summary.totalSamples) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
