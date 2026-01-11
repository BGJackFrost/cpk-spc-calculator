import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Loader2, BarChart3, TrendingUp, TrendingDown, Target, CalendarIcon, RefreshCw } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";

interface CapacityComparisonChartProps {
  factoryId?: number;
  className?: string;
  showControls?: boolean;
  height?: number;
}

export default function CapacityComparisonChart({
  factoryId,
  className,
  showControls = true,
  height = 400,
}: CapacityComparisonChartProps) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedFactory, setSelectedFactory] = useState<string>(factoryId?.toString() || "all");

  // Fetch factories for filter
  const { data: factoriesData } = trpc.factoryWorkshop.listFactories.useQuery({});

  // Fetch capacity summary
  const { data: capacitySummary, isLoading, refetch } = trpc.factoryWorkshop.getCapacitySummary.useQuery({
    factoryId: selectedFactory !== "all" ? parseInt(selectedFactory) : undefined,
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Process data for chart
  const chartData = useMemo(() => {
    if (!capacitySummary) return [];

    return capacitySummary.map((item: any) => ({
      name: item.workshop_name || item.workshop_code,
      workshopCode: item.workshop_code,
      factoryName: item.factory_name,
      planned: item.total_planned || 0,
      actual: item.total_actual || 0,
      maxCapacity: item.max_capacity || 0,
      efficiency: parseFloat(item.avg_efficiency) || 0,
      achievementRate: parseFloat(item.achievementRate) || 0,
      utilizationRate: parseFloat(item.utilizationRate) || 0,
      planCount: item.plan_count || 0,
    }));
  }, [capacitySummary]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;

    const totalPlanned = chartData.reduce((sum, d) => sum + d.planned, 0);
    const totalActual = chartData.reduce((sum, d) => sum + d.actual, 0);
    const avgEfficiency = chartData.reduce((sum, d) => sum + d.efficiency, 0) / chartData.length;
    const avgAchievement = chartData.reduce((sum, d) => sum + d.achievementRate, 0) / chartData.length;
    const workshopsAboveTarget = chartData.filter(d => d.actual >= d.planned).length;
    const workshopsBelowTarget = chartData.filter(d => d.actual < d.planned && d.planned > 0).length;

    return {
      totalPlanned,
      totalActual,
      overallUtilization: totalPlanned > 0 ? (totalActual / totalPlanned * 100) : 0,
      avgEfficiency,
      avgAchievement,
      workshopsAboveTarget,
      workshopsBelowTarget,
      totalWorkshops: chartData.length,
    };
  }, [chartData]);

  const getStatusColor = (rate: number) => {
    if (rate >= 100) return "text-green-600";
    if (rate >= 80) return "text-blue-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (rate: number) => {
    if (rate >= 100) return { label: "Vượt KH", variant: "default" as const, className: "bg-green-100 text-green-700" };
    if (rate >= 80) return { label: "Đạt KH", variant: "secondary" as const, className: "bg-blue-100 text-blue-700" };
    if (rate >= 60) return { label: "Gần đạt", variant: "outline" as const, className: "bg-yellow-100 text-yellow-700" };
    return { label: "Chưa đạt", variant: "destructive" as const, className: "bg-red-100 text-red-700" };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = getStatusBadge(data.utilizationRate);
      return (
        <div className="bg-background border rounded-lg shadow-lg p-4 min-w-[220px]">
          <p className="font-semibold text-base">{label}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.factoryName}</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Kế hoạch:</span>
              <span className="font-medium">{data.planned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Thực tế:</span>
              <span className={`font-medium ${getStatusColor(data.utilizationRate)}`}>
                {data.actual.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Công suất max:</span>
              <span className="font-medium">{data.maxCapacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Hiệu suất:</span>
              <span className="font-medium">{data.efficiency.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tỷ lệ đạt:</span>
              <Badge className={status.className}>{data.utilizationRate.toFixed(1)}%</Badge>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            So sánh công suất thực tế vs kế hoạch
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              So sánh công suất thực tế vs kế hoạch
            </CardTitle>
            <CardDescription>
              Theo dõi hiệu suất công suất của từng Workshop
            </CardDescription>
          </div>
          {showControls && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Chọn nhà máy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {factoriesData?.data?.map((f: any) => (
                    <SelectItem key={f.id} value={f.id.toString()}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM", { locale: vi })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: vi })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: vi })
                      )
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                      }
                    }}
                    numberOfMonths={2}
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Tổng kế hoạch</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryStats.totalPlanned.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Tổng thực tế</p>
              <p className={`text-2xl font-bold ${getStatusColor(summaryStats.overallUtilization)}`}>
                {summaryStats.totalActual.toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {summaryStats.overallUtilization >= 100 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${summaryStats.overallUtilization >= 100 ? "text-green-500" : "text-red-500"}`}>
                  {summaryStats.overallUtilization.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Hiệu suất TB</p>
              <p className={`text-2xl font-bold ${getStatusColor(summaryStats.avgEfficiency)}`}>
                {summaryStats.avgEfficiency.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Đạt / Chưa đạt</p>
              <p className="text-2xl font-bold">
                <span className="text-green-600">{summaryStats.workshopsAboveTarget}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-red-600">{summaryStats.workshopsBelowTarget}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {summaryStats.totalWorkshops} workshop
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 ? (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 120]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {/* Reference line at 100% */}
                <ReferenceLine
                  yAxisId="right"
                  y={100}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  label={{ value: "100%", position: "right", fontSize: 10, fill: "#22c55e" }}
                />

                <Bar
                  yAxisId="left"
                  dataKey="planned"
                  name="Kế hoạch"
                  fill="#93c5fd"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="actual"
                  name="Thực tế"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="utilizationRate"
                  name="Tỷ lệ đạt (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <Target className="h-12 w-12 mb-4 opacity-50" />
            <p>Không có dữ liệu kế hoạch công suất</p>
            <p className="text-sm">Vui lòng tạo kế hoạch công suất cho các Workshop</p>
          </div>
        )}

        {/* Workshop Status Table */}
        {chartData.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Workshop</th>
                  <th className="text-right py-2 px-3">Kế hoạch</th>
                  <th className="text-right py-2 px-3">Thực tế</th>
                  <th className="text-right py-2 px-3">Chênh lệch</th>
                  <th className="text-right py-2 px-3">Tỷ lệ</th>
                  <th className="text-center py-2 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => {
                  const diff = item.actual - item.planned;
                  const status = getStatusBadge(item.utilizationRate);
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.factoryName}</p>
                        </div>
                      </td>
                      <td className="text-right py-2 px-3">{item.planned.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{item.actual.toLocaleString()}</td>
                      <td className={cn("text-right py-2 px-3 font-medium", diff >= 0 ? "text-green-600" : "text-red-600")}>
                        {diff >= 0 ? "+" : ""}{diff.toLocaleString()}
                      </td>
                      <td className={cn("text-right py-2 px-3 font-medium", getStatusColor(item.utilizationRate))}>
                        {item.utilizationRate.toFixed(1)}%
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge className={status.className}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
