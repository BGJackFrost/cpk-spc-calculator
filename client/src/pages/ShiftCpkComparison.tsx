import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Clock, TrendingUp, TrendingDown, Minus, BarChart3, Calendar, Filter, Download, Sun, Moon, Sunrise } from "lucide-react";
import { toast } from "sonner";

// Định nghĩa các ca làm việc mặc định
const DEFAULT_SHIFTS = [
  { id: "morning", name: "Ca sáng", icon: Sunrise, startHour: 6, endHour: 14, color: "bg-yellow-100 text-yellow-800" },
  { id: "afternoon", name: "Ca chiều", icon: Sun, startHour: 14, endHour: 22, color: "bg-orange-100 text-orange-800" },
  { id: "night", name: "Ca đêm", icon: Moon, startHour: 22, endHour: 6, color: "bg-indigo-100 text-indigo-800" },
];

interface ShiftCpkData {
  shiftId: string;
  shiftName: string;
  avgCpk: number;
  minCpk: number;
  maxCpk: number;
  sampleCount: number;
  analysisCount: number;
  trend: "up" | "down" | "stable";
}

interface DailyShiftData {
  date: string;
  shifts: {
    [key: string]: {
      cpk: number;
      count: number;
    };
  };
}

export default function ShiftCpkComparison() {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedLine, setSelectedLine] = useState<string>("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Fetch data
  const { data: products = [] } = trpc.product.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();
  const { data: productionLines = [] } = trpc.productionLine.list.useQuery();
  const { data: analysisHistory = [] } = trpc.spc.history.useQuery({
    limit: 1000,
  });

  // Process data by shift
  const shiftData = useMemo(() => {
    const filteredHistory = analysisHistory.filter((h: any) => {
      if (selectedProduct !== "all" && h.productId !== parseInt(selectedProduct)) return false;
      if (selectedStation !== "all" && h.workstationId !== parseInt(selectedStation)) return false;
      if (selectedLine !== "all" && h.productionLineId !== parseInt(selectedLine)) return false;
      return true;
    });

    const shiftStats: { [key: string]: { cpks: number[], counts: number[], dates: string[] } } = {};
    DEFAULT_SHIFTS.forEach(s => {
      shiftStats[s.id] = { cpks: [], counts: [], dates: [] };
    });

    filteredHistory.forEach((h: any) => {
      if (!h.cpk || !h.analyzedAt) return;
      
      const date = new Date(h.analyzedAt);
      const hour = date.getHours();
      
      // Determine shift
      let shiftId = "night";
      if (hour >= 6 && hour < 14) shiftId = "morning";
      else if (hour >= 14 && hour < 22) shiftId = "afternoon";
      
      shiftStats[shiftId].cpks.push(h.cpk);
      shiftStats[shiftId].counts.push(h.sampleCount || 1);
      shiftStats[shiftId].dates.push(date.toISOString().split("T")[0]);
    });

    const result: ShiftCpkData[] = DEFAULT_SHIFTS.map(shift => {
      const stats = shiftStats[shift.id];
      const cpks = stats.cpks;
      
      if (cpks.length === 0) {
        return {
          shiftId: shift.id,
          shiftName: shift.name,
          avgCpk: 0,
          minCpk: 0,
          maxCpk: 0,
          sampleCount: 0,
          analysisCount: 0,
          trend: "stable" as const,
        };
      }

      const avgCpk = cpks.reduce((a, b) => a + b, 0) / cpks.length;
      const minCpk = Math.min(...cpks);
      const maxCpk = Math.max(...cpks);
      const sampleCount = stats.counts.reduce((a, b) => a + b, 0);
      
      // Calculate trend (compare first half vs second half)
      const halfIndex = Math.floor(cpks.length / 2);
      const firstHalf = cpks.slice(0, halfIndex);
      const secondHalf = cpks.slice(halfIndex);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
      
      let trend: "up" | "down" | "stable" = "stable";
      if (secondAvg > firstAvg * 1.05) trend = "up";
      else if (secondAvg < firstAvg * 0.95) trend = "down";

      return {
        shiftId: shift.id,
        shiftName: shift.name,
        avgCpk,
        minCpk,
        maxCpk,
        sampleCount,
        analysisCount: cpks.length,
        trend,
      };
    });

    return result;
  }, [analysisHistory, selectedProduct, selectedStation, selectedLine]);

  // Daily shift data for chart
  const dailyData = useMemo(() => {
    const filteredHistory = analysisHistory.filter((h: any) => {
      if (selectedProduct !== "all" && h.productId !== parseInt(selectedProduct)) return false;
      if (selectedStation !== "all" && h.workstationId !== parseInt(selectedStation)) return false;
      if (selectedLine !== "all" && h.productionLineId !== parseInt(selectedLine)) return false;
      return true;
    });

    const dailyMap: { [date: string]: { [shift: string]: { cpks: number[], count: number } } } = {};

    filteredHistory.forEach((h: any) => {
      if (!h.cpk || !h.analyzedAt) return;
      
      const date = new Date(h.analyzedAt);
      const dateStr = date.toISOString().split("T")[0];
      const hour = date.getHours();
      
      let shiftId = "night";
      if (hour >= 6 && hour < 14) shiftId = "morning";
      else if (hour >= 14 && hour < 22) shiftId = "afternoon";
      
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {};
        DEFAULT_SHIFTS.forEach(s => {
          dailyMap[dateStr][s.id] = { cpks: [], count: 0 };
        });
      }
      
      dailyMap[dateStr][shiftId].cpks.push(h.cpk);
      dailyMap[dateStr][shiftId].count++;
    });

    return Object.entries(dailyMap)
      .map(([date, shifts]) => ({
        date,
        shifts: Object.fromEntries(
          Object.entries(shifts).map(([shiftId, data]) => [
            shiftId,
            {
              cpk: data.cpks.length > 0 ? data.cpks.reduce((a, b) => a + b, 0) / data.cpks.length : 0,
              count: data.count,
            },
          ])
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analysisHistory, selectedProduct, selectedStation, selectedLine]);

  const getCpkBadge = (cpk: number) => {
    if (cpk === 0) return <Badge variant="outline">N/A</Badge>;
    if (cpk >= 1.67) return <Badge className="bg-green-500">Xuất sắc</Badge>;
    if (cpk >= 1.33) return <Badge className="bg-blue-500">Tốt</Badge>;
    if (cpk >= 1.0) return <Badge className="bg-yellow-500">Chấp nhận</Badge>;
    return <Badge variant="destructive">Cần cải thiện</Badge>;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const exportData = () => {
    const csv = [
      ["Ca làm việc", "CPK Trung bình", "CPK Min", "CPK Max", "Số mẫu", "Số lần phân tích", "Xu hướng"].join(","),
      ...shiftData.map(s => [
        s.shiftName,
        s.avgCpk.toFixed(3),
        s.minCpk.toFixed(3),
        s.maxCpk.toFixed(3),
        s.sampleCount,
        s.analysisCount,
        s.trend === "up" ? "Tăng" : s.trend === "down" ? "Giảm" : "Ổn định",
      ].join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpk-shift-comparison-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất dữ liệu thành công");
  };

  // Find best and worst shift
  const bestShift = shiftData.reduce((best, current) => 
    current.avgCpk > best.avgCpk ? current : best, shiftData[0]);
  const worstShift = shiftData.filter(s => s.avgCpk > 0).reduce((worst, current) => 
    current.avgCpk < worst.avgCpk ? current : worst, shiftData.find(s => s.avgCpk > 0) || shiftData[0]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              So sánh CPK theo Ca làm việc
            </h1>
            <p className="text-muted-foreground">
              Phân tích và so sánh hiệu suất CPK giữa các ca làm việc
            </p>
          </div>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Dây chuyền</Label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                    {productionLines.map((line: any) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sản phẩm</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Công trạm</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công trạm</SelectItem>
                    {workstations.map((ws: any) => (
                      <SelectItem key={ws.id} value={ws.id.toString()}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_SHIFTS.map((shift, index) => {
            const data = shiftData[index];
            const ShiftIcon = shift.icon;
            return (
              <Card key={shift.id} className={data.avgCpk === bestShift?.avgCpk && data.avgCpk > 0 ? "ring-2 ring-green-500" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShiftIcon className="h-5 w-5" />
                      {shift.name}
                    </span>
                    <Badge className={shift.color}>
                      {shift.startHour}:00 - {shift.endHour}:00
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {data.avgCpk > 0 ? data.avgCpk.toFixed(3) : "N/A"}
                      </span>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(data.trend)}
                        {getCpkBadge(data.avgCpk)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Min: {data.minCpk > 0 ? data.minCpk.toFixed(3) : "N/A"}</div>
                      <div>Max: {data.maxCpk > 0 ? data.maxCpk.toFixed(3) : "N/A"}</div>
                      <div>Số mẫu: {data.sampleCount}</div>
                      <div>Phân tích: {data.analysisCount}</div>
                    </div>
                    {data.avgCpk === bestShift?.avgCpk && data.avgCpk > 0 && (
                      <Badge className="bg-green-500 w-full justify-center">Ca tốt nhất</Badge>
                    )}
                    {data.avgCpk === worstShift?.avgCpk && data.avgCpk > 0 && data.avgCpk !== bestShift?.avgCpk && (
                      <Badge variant="destructive" className="w-full justify-center">Cần cải thiện</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Chi tiết theo ngày
            </CardTitle>
            <CardDescription>
              CPK trung bình của từng ca theo ngày
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    {DEFAULT_SHIFTS.map(shift => (
                      <TableHead key={shift.id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <shift.icon className="h-4 w-4" />
                          {shift.name}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Không có dữ liệu trong khoảng thời gian đã chọn
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyData.slice(-30).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {new Date(day.date).toLocaleDateString("vi-VN")}
                        </TableCell>
                        {DEFAULT_SHIFTS.map(shift => {
                          const shiftData = day.shifts[shift.id];
                          return (
                            <TableCell key={shift.id} className="text-center">
                              {shiftData && shiftData.cpk > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span className={`font-medium ${
                                    shiftData.cpk >= 1.33 ? "text-green-600" :
                                    shiftData.cpk >= 1.0 ? "text-yellow-600" : "text-red-600"
                                  }`}>
                                    {shiftData.cpk.toFixed(3)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({shiftData.count} lần)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        {shiftData.some(s => s.avgCpk > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Phân tích & Khuyến nghị</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bestShift && bestShift.avgCpk > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <h4 className="font-semibold text-green-800 dark:text-green-200">
                      Ca hiệu suất cao nhất: {bestShift.shiftName}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      CPK trung bình: {bestShift.avgCpk.toFixed(3)} với {bestShift.analysisCount} lần phân tích.
                      Nên tìm hiểu các yếu tố thành công của ca này để áp dụng cho các ca khác.
                    </p>
                  </div>
                )}
                {worstShift && worstShift.avgCpk > 0 && worstShift.avgCpk !== bestShift?.avgCpk && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <h4 className="font-semibold text-red-800 dark:text-red-200">
                      Ca cần cải thiện: {worstShift.shiftName}
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      CPK trung bình: {worstShift.avgCpk.toFixed(3)}. 
                      Chênh lệch {((bestShift?.avgCpk || 0) - worstShift.avgCpk).toFixed(3)} so với ca tốt nhất.
                      Cần xem xét các yếu tố: nhân sự, thiết bị, môi trường làm việc.
                    </p>
                  </div>
                )}
                {shiftData.some(s => s.trend === "down") && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Cảnh báo xu hướng giảm
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Các ca có xu hướng CPK giảm: {shiftData.filter(s => s.trend === "down").map(s => s.shiftName).join(", ")}.
                      Cần theo dõi và có biện pháp cải thiện kịp thời.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
