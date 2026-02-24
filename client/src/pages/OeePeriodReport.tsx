import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Sun,
  Moon,
  Sunset,
  Download,
  RefreshCw,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { value: "shift", label: "Theo ca", icon: Clock },
  { value: "day", label: "Theo ngày", icon: Calendar },
  { value: "week", label: "Theo tuần", icon: Calendar },
  { value: "month", label: "Theo tháng", icon: Calendar },
];

function getDateRange(period: string) {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "shift":
    case "day":
      start.setDate(start.getDate() - 30);
      break;
    case "week":
      start.setDate(start.getDate() - 90);
      break;
    case "month":
      start.setMonth(start.getMonth() - 12);
      break;
  }
  return { start, end };
}

function getOeeColor(value: number) {
  if (value >= 85) return "text-green-600";
  if (value >= 65) return "text-yellow-600";
  return "text-red-600";
}

function getOeeBadge(value: number) {
  if (value >= 85) return <Badge className="bg-green-500">World Class</Badge>;
  if (value >= 65) return <Badge className="bg-yellow-500">Trung bình</Badge>;
  return <Badge className="bg-red-500">Cần cải thiện</Badge>;
}

export default function OeePeriodReport() {
  const [period, setPeriod] = useState<"shift" | "day" | "week" | "month">("day");
  const dateRange = useMemo(() => getDateRange(period), [period]);

  const { data: productionLines = [] } = trpc.productionLine.list.useQuery();
  const [selectedLineId, setSelectedLineId] = useState<number | undefined>();

  const exportMutation = trpc.oee.exportPeriodExcel.useMutation({
    onSuccess: (result) => {
      window.open(result.url, '_blank');
      toast.success('Đã xuất báo cáo OEE Excel thành công');
    },
    onError: (err) => toast.error('Lỗi xuất Excel: ' + err.message),
  });

  const exportPdfMutation = trpc.oee.exportPeriodPdf.useMutation({
    onSuccess: (result) => {
      window.open(result.url, '_blank');
      toast.success('Đã xuất báo cáo OEE PDF thành công');
    },
    onError: (err) => toast.error('Lỗi xuất PDF: ' + err.message),
  });

  const { data: periodData = [], isLoading, refetch } = trpc.oee.getPeriodSummary.useQuery({
    period,
    startDate: dateRange.start,
    endDate: dateRange.end,
    productionLineId: selectedLineId,
  });

  // Calculate overall summary
  const summary = useMemo(() => {
    if (!periodData.length) return null;
    const totalRecords = periodData.reduce((s, d) => s + d.recordCount, 0);
    const avgOee = periodData.reduce((s, d) => s + d.avgOee * d.recordCount, 0) / (totalRecords || 1);
    const avgAvailability = periodData.reduce((s, d) => s + d.avgAvailability * d.recordCount, 0) / (totalRecords || 1);
    const avgPerformance = periodData.reduce((s, d) => s + d.avgPerformance * d.recordCount, 0) / (totalRecords || 1);
    const avgQuality = periodData.reduce((s, d) => s + d.avgQuality * d.recordCount, 0) / (totalRecords || 1);
    const totalGood = periodData.reduce((s, d) => s + d.totalGoodCount, 0);
    const totalDefect = periodData.reduce((s, d) => s + d.totalDefectCount, 0);
    const bestPeriod = periodData.reduce((best, d) => d.avgOee > best.avgOee ? d : best, periodData[0]);
    const worstPeriod = periodData.reduce((worst, d) => d.avgOee < worst.avgOee ? d : worst, periodData[0]);
    return { avgOee, avgAvailability, avgPerformance, avgQuality, totalGood, totalDefect, totalRecords, bestPeriod, worstPeriod };
  }, [periodData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Báo cáo OEE theo kỳ
            </h1>
            <p className="text-muted-foreground mt-1">
              Phân tích OEE theo ca, ngày, tuần, tháng
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedLineId ? String(selectedLineId) : "all"}
              onValueChange={(v) => setSelectedLineId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {productionLines.map((line: any) => (
                  <SelectItem key={line.id} value={String(line.id)}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              disabled={periodData.length === 0 || exportMutation.isPending}
              onClick={() => {
                exportMutation.mutate({
                  period,
                  startDate: dateRange.start,
                  endDate: dateRange.end,
                  productionLineId: selectedLineId,
                  data: periodData,
                });
              }}
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              disabled={periodData.length === 0 || exportPdfMutation.isPending}
              onClick={() => {
                exportPdfMutation.mutate({
                  period,
                  startDate: dateRange.start,
                  endDate: dateRange.end,
                  productionLineId: selectedLineId,
                  data: periodData,
                });
              }}
            >
              {exportPdfMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Xuất PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">OEE Trung bình</p>
                    <p className={`text-2xl font-bold ${getOeeColor(summary.avgOee)}`}>
                      {summary.avgOee.toFixed(1)}%
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground/30" />
                </div>
                {getOeeBadge(summary.avgOee)}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Availability</p>
                    <p className={`text-2xl font-bold ${getOeeColor(summary.avgAvailability)}`}>
                      {summary.avgAvailability.toFixed(1)}%
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Performance</p>
                    <p className={`text-2xl font-bold ${getOeeColor(summary.avgPerformance)}`}>
                      {summary.avgPerformance.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Quality</p>
                    <p className={`text-2xl font-bold ${getOeeColor(summary.avgQuality)}`}>
                      {summary.avgQuality.toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Best/Worst Period */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  Kỳ tốt nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{summary.bestPeriod.label}</p>
                <p className="text-sm text-muted-foreground">
                  OEE: {summary.bestPeriod.avgOee.toFixed(1)}% | A: {summary.bestPeriod.avgAvailability.toFixed(1)}% | P: {summary.bestPeriod.avgPerformance.toFixed(1)}% | Q: {summary.bestPeriod.avgQuality.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  Kỳ cần cải thiện
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{summary.worstPeriod.label}</p>
                <p className="text-sm text-muted-foreground">
                  OEE: {summary.worstPeriod.avgOee.toFixed(1)}% | A: {summary.worstPeriod.avgAvailability.toFixed(1)}% | P: {summary.worstPeriod.avgPerformance.toFixed(1)}% | Q: {summary.worstPeriod.avgQuality.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Period Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Chi tiết theo kỳ</CardTitle>
            <CardDescription>
              {periodData.length} kỳ | {summary?.totalRecords || 0} bản ghi OEE
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : periodData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Không có dữ liệu OEE trong khoảng thời gian đã chọn
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Kỳ</th>
                      <th className="text-right py-2 px-3 font-medium">OEE (%)</th>
                      <th className="text-right py-2 px-3 font-medium">Availability</th>
                      <th className="text-right py-2 px-3 font-medium">Performance</th>
                      <th className="text-right py-2 px-3 font-medium">Quality</th>
                      <th className="text-right py-2 px-3 font-medium">SP tốt</th>
                      <th className="text-right py-2 px-3 font-medium">SP lỗi</th>
                      <th className="text-right py-2 px-3 font-medium">Bản ghi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodData.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">{row.label}</td>
                        <td className={`text-right py-2 px-3 font-bold ${getOeeColor(row.avgOee)}`}>
                          {row.avgOee.toFixed(1)}%
                        </td>
                        <td className="text-right py-2 px-3">{row.avgAvailability.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3">{row.avgPerformance.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3">{row.avgQuality.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 text-green-600">{row.totalGoodCount.toLocaleString()}</td>
                        <td className="text-right py-2 px-3 text-red-600">{row.totalDefectCount.toLocaleString()}</td>
                        <td className="text-right py-2 px-3 text-muted-foreground">{row.recordCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OEE Bar Chart Visualization */}
        {periodData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Biểu đồ OEE theo kỳ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {periodData.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-muted-foreground truncate">{row.label}</div>
                    <div className="flex-1 flex gap-1 h-6">
                      <div
                        className="bg-blue-500 rounded-l h-full flex items-center justify-center text-[10px] text-white font-medium"
                        style={{ width: `${Math.max(row.avgAvailability * 0.33, 2)}%` }}
                        title={`Availability: ${row.avgAvailability.toFixed(1)}%`}
                      >
                        {row.avgAvailability > 20 ? `A:${row.avgAvailability.toFixed(0)}` : ''}
                      </div>
                      <div
                        className="bg-green-500 h-full flex items-center justify-center text-[10px] text-white font-medium"
                        style={{ width: `${Math.max(row.avgPerformance * 0.33, 2)}%` }}
                        title={`Performance: ${row.avgPerformance.toFixed(1)}%`}
                      >
                        {row.avgPerformance > 20 ? `P:${row.avgPerformance.toFixed(0)}` : ''}
                      </div>
                      <div
                        className="bg-purple-500 rounded-r h-full flex items-center justify-center text-[10px] text-white font-medium"
                        style={{ width: `${Math.max(row.avgQuality * 0.33, 2)}%` }}
                        title={`Quality: ${row.avgQuality.toFixed(1)}%`}
                      >
                        {row.avgQuality > 20 ? `Q:${row.avgQuality.toFixed(0)}` : ''}
                      </div>
                    </div>
                    <div className={`w-16 text-right text-sm font-bold ${getOeeColor(row.avgOee)}`}>
                      {row.avgOee.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Availability</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Performance</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded" /> Quality</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
