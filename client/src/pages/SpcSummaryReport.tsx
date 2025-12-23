/**
 * SPC Summary Report Page
 * Trang xuất báo cáo SPC/CPK tổng hợp theo ca/ngày/tuần/tháng
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  Clock,
  Sun,
  Moon,
  Sunrise,
  RefreshCw,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import { toast } from "sonner";

type PeriodType = "shift" | "day" | "week" | "month";

const PERIOD_OPTIONS: { value: PeriodType; label: string; icon: React.ReactNode }[] = [
  { value: "shift", label: "Theo ca làm việc", icon: <Clock className="w-4 h-4" /> },
  { value: "day", label: "Theo ngày", icon: <Calendar className="w-4 h-4" /> },
  { value: "week", label: "Theo tuần", icon: <Calendar className="w-4 h-4" /> },
  { value: "month", label: "Theo tháng", icon: <Calendar className="w-4 h-4" /> },
];

const SHIFT_ICONS = {
  morning: Sunrise,
  afternoon: Sun,
  night: Moon,
};

function getCpkStatusColor(cpk: number | null): string {
  if (cpk === null) return "bg-gray-100 text-gray-600";
  if (cpk >= 1.67) return "bg-green-100 text-green-800";
  if (cpk >= 1.33) return "bg-blue-100 text-blue-800";
  if (cpk >= 1.0) return "bg-yellow-100 text-yellow-800";
  if (cpk >= 0.67) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

function getCpkStatusLabel(cpk: number | null): string {
  if (cpk === null) return "N/A";
  if (cpk >= 1.67) return "Xuất sắc";
  if (cpk >= 1.33) return "Tốt";
  if (cpk >= 1.0) return "Chấp nhận";
  if (cpk >= 0.67) return "Cần cải thiện";
  return "Nguy hiểm";
}

export default function SpcSummaryReport() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  });

  // Fetch SPC Plans
  const { data: spcPlans = [] } = trpc.spcPlan.list.useQuery();

  // Fetch report data
  const { data: reportData, isLoading, refetch } = trpc.spc.getSummaryReportData.useQuery(
    {
      planId: selectedPlanId!,
      periodType,
      startDate: dateRange.start,
      endDate: dateRange.end,
    },
    { enabled: !!selectedPlanId }
  );

  // Export mutations
  const exportHtmlMutation = trpc.spc.exportSummaryReportHtml.useMutation({
    onSuccess: (data) => {
      // Open HTML in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        toast.success("Báo cáo đã được mở trong tab mới");
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const exportCsvMutation = trpc.spc.exportSummaryReportCsv.useMutation({
    onSuccess: (data) => {
      // Download CSV
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `spc-summary-report-${periodType}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải xuống file CSV");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleExportHtml = () => {
    if (!selectedPlanId) {
      toast.error("Vui lòng chọn kế hoạch SPC");
      return;
    }
    exportHtmlMutation.mutate({
      planId: selectedPlanId,
      periodType,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  };

  const handleExportCsv = () => {
    if (!selectedPlanId) {
      toast.error("Vui lòng chọn kế hoạch SPC");
      return;
    }
    exportCsvMutation.mutate({
      planId: selectedPlanId,
      periodType,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  };

  const handlePrint = () => {
    handleExportHtml();
  };

  // Calculate distribution percentages
  const distributionData = useMemo(() => {
    if (!reportData?.summary) return null;
    const total = reportData.summary.totalPeriods;
    if (total === 0) return null;

    return {
      excellent: (reportData.summary.excellentCount / total) * 100,
      good: (reportData.summary.goodCount / total) * 100,
      acceptable: (reportData.summary.acceptableCount / total) * 100,
      needsImprovement: (reportData.summary.needsImprovementCount / total) * 100,
      critical: (reportData.summary.criticalCount / total) * 100,
    };
  }, [reportData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo SPC/CPK Tổng hợp</h1>
            <p className="text-muted-foreground">
              Xuất báo cáo thống kê SPC/CPK theo ca, ngày, tuần hoặc tháng
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={!selectedPlanId || isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bộ lọc báo cáo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Plan selector */}
              <div className="space-y-2">
                <Label>Kế hoạch SPC</Label>
                <Select
                  value={selectedPlanId?.toString() || ""}
                  onValueChange={(v) => setSelectedPlanId(parseInt(v) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kế hoạch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {spcPlans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name} {plan.status === "active" ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period type */}
              <div className="space-y-2">
                <Label>Loại chu kỳ</Label>
                <Select
                  value={periodType}
                  onValueChange={(v) => setPeriodType(v as PeriodType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start date */}
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  value={dateRange.start.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: new Date(e.target.value),
                    }))
                  }
                />
              </div>

              {/* End date */}
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  value={dateRange.end.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: new Date(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Button
                onClick={handlePrint}
                disabled={!selectedPlanId || exportHtmlMutation.isPending}
              >
                <Printer className="w-4 h-4 mr-2" />
                In báo cáo
              </Button>
              <Button
                variant="outline"
                onClick={handleExportHtml}
                disabled={!selectedPlanId || exportHtmlMutation.isPending}
              >
                <FileText className="w-4 h-4 mr-2" />
                Xuất HTML
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={!selectedPlanId || exportCsvMutation.isPending}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Xuất CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Đang tải dữ liệu báo cáo...
            </CardContent>
          </Card>
        ) : !selectedPlanId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Vui lòng chọn kế hoạch SPC để xem báo cáo
            </CardContent>
          </Card>
        ) : !reportData ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không có dữ liệu cho khoảng thời gian đã chọn
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {reportData.summary.avgCpk?.toFixed(3) || "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">CPK Trung bình</div>
                    <Badge className={getCpkStatusColor(reportData.summary.avgCpk)}>
                      {getCpkStatusLabel(reportData.summary.avgCpk)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{reportData.summary.totalPeriods}</div>
                    <div className="text-sm text-muted-foreground mt-1">Tổng số chu kỳ</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold">
                      {reportData.summary.totalSamples.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Tổng số mẫu</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between text-center">
                    <div>
                      <div className="text-xl font-bold text-red-600">
                        {reportData.summary.minCpk?.toFixed(3) || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">Min CPK</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {reportData.summary.maxCpk?.toFixed(3) || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">Max CPK</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Distribution & Shift Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Phân bố theo trạng thái CPK
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {distributionData ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Xuất sắc (≥1.67)</span>
                          <span>{reportData.summary.excellentCount} ({distributionData.excellent.toFixed(1)}%)</span>
                        </div>
                        <Progress value={distributionData.excellent} className="h-2 [&>div]:bg-green-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Tốt (≥1.33)</span>
                          <span>{reportData.summary.goodCount} ({distributionData.good.toFixed(1)}%)</span>
                        </div>
                        <Progress value={distributionData.good} className="h-2 [&>div]:bg-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Chấp nhận (≥1.0)</span>
                          <span>{reportData.summary.acceptableCount} ({distributionData.acceptable.toFixed(1)}%)</span>
                        </div>
                        <Progress value={distributionData.acceptable} className="h-2 [&>div]:bg-yellow-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Cần cải thiện (≥0.67)</span>
                          <span>{reportData.summary.needsImprovementCount} ({distributionData.needsImprovement.toFixed(1)}%)</span>
                        </div>
                        <Progress value={distributionData.needsImprovement} className="h-2 [&>div]:bg-orange-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Nguy hiểm (&lt;0.67)</span>
                          <span>{reportData.summary.criticalCount} ({distributionData.critical.toFixed(1)}%)</span>
                        </div>
                        <Progress value={distributionData.critical} className="h-2 [&>div]:bg-red-500" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Không có dữ liệu
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shift Comparison */}
              {reportData.shiftComparison && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      So sánh theo ca làm việc
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                        <Sunrise className="w-6 h-6 mx-auto text-amber-600" />
                        <div className="text-sm font-medium mt-2">Ca sáng</div>
                        <div className="text-2xl font-bold mt-1">
                          {reportData.shiftComparison.morning.avgCpk?.toFixed(3) || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reportData.shiftComparison.morning.count} chu kỳ
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-center">
                        <Sun className="w-6 h-6 mx-auto text-orange-600" />
                        <div className="text-sm font-medium mt-2">Ca chiều</div>
                        <div className="text-2xl font-bold mt-1">
                          {reportData.shiftComparison.afternoon.avgCpk?.toFixed(3) || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reportData.shiftComparison.afternoon.count} chu kỳ
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-center">
                        <Moon className="w-6 h-6 mx-auto text-indigo-600" />
                        <div className="text-sm font-medium mt-2">Ca đêm</div>
                        <div className="text-2xl font-bold mt-1">
                          {reportData.shiftComparison.night.avgCpk?.toFixed(3) || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {reportData.shiftComparison.night.count} chu kỳ
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Detail Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chi tiết theo {PERIOD_OPTIONS.find(p => p.value === periodType)?.label.toLowerCase()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Thời gian</th>
                        {periodType === "shift" && <th className="text-left p-3">Ca</th>}
                        <th className="text-right p-3">CPK</th>
                        <th className="text-right p-3">CP</th>
                        <th className="text-right p-3">PPK</th>
                        <th className="text-right p-3">Mean</th>
                        <th className="text-right p-3">StdDev</th>
                        <th className="text-right p-3">Số mẫu</th>
                        <th className="text-center p-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.periodData.map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            {new Date(row.periodStart).toLocaleDateString("vi-VN")}{" "}
                            {new Date(row.periodStart).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          {periodType === "shift" && (
                            <td className="p-3">{row.shiftName || "N/A"}</td>
                          )}
                          <td className="text-right p-3 font-mono font-bold">
                            {row.cpk?.toFixed(3) || "N/A"}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {row.cp?.toFixed(3) || "N/A"}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {row.ppk?.toFixed(3) || "N/A"}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {row.mean?.toFixed(3) || "N/A"}
                          </td>
                          <td className="text-right p-3 font-mono">
                            {row.stdDev?.toFixed(4) || "N/A"}
                          </td>
                          <td className="text-right p-3">
                            {row.sampleCount.toLocaleString()}
                          </td>
                          <td className="text-center p-3">
                            <Badge className={getCpkStatusColor(row.cpk)}>
                              {getCpkStatusLabel(row.cpk)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
