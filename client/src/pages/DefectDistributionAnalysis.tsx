import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, PieChart, TrendingUp, AlertTriangle, Download, RefreshCw, 
  Calendar, Filter, Loader2, Info
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement
);

export default function DefectDistributionAnalysis() {
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [activeTab, setActiveTab] = useState("distribution");

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(dateRange));
    return {
      startDate: start.toISOString().slice(0, 19).replace("T", " "),
      endDate: end.toISOString().slice(0, 19).replace("T", " "),
    };
  }, [dateRange]);

  const { data: productionLines } = trpc.productionLine.list.useQuery();
  
  const { data: defectSummary, isLoading: summaryLoading, refetch: refetchSummary } = 
    trpc.defectAnalytics.getDefectSummary.useQuery({
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
      startDate,
      endDate,
    });

  const { data: paretoData, isLoading: paretoLoading } = 
    trpc.defectAnalytics.getParetoAnalysis.useQuery({
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
      startDate,
      endDate,
    });

  const { data: trendData, isLoading: trendLoading } = 
    trpc.defectAnalytics.getDefectTrend.useQuery({
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
      days: parseInt(dateRange),
    });

  const chartColors = [
    "rgba(239, 68, 68, 0.8)",
    "rgba(249, 115, 22, 0.8)",
    "rgba(234, 179, 8, 0.8)",
    "rgba(34, 197, 94, 0.8)",
    "rgba(59, 130, 246, 0.8)",
    "rgba(168, 85, 247, 0.8)",
    "rgba(236, 72, 153, 0.8)",
    "rgba(107, 114, 128, 0.8)",
  ];

  const pieChartData = useMemo(() => {
    if (!paretoData?.paretoData) return null;
    const top8 = paretoData.paretoData.slice(0, 8);
    return {
      labels: top8.map((d: any) => d.name),
      datasets: [{
        data: top8.map((d: any) => d.count),
        backgroundColor: chartColors,
        borderColor: chartColors.map(c => c.replace("0.8", "1")),
        borderWidth: 1,
      }],
    };
  }, [paretoData]);

  const paretoChartData = useMemo(() => {
    if (!paretoData?.paretoData) return null;
    const data = paretoData.paretoData.filter((d: any) => d.count > 0);
    return {
      labels: data.map((d: any) => d.name),
      datasets: [
        {
          type: "bar" as const,
          label: "Số lượng lỗi",
          data: data.map((d: any) => d.count),
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          type: "line" as const,
          label: "Tích lũy %",
          data: data.map((d: any) => d.cumulative),
          borderColor: "rgba(239, 68, 68, 1)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: "y1",
        },
      ],
    };
  }, [paretoData]);

  const trendChartData = useMemo(() => {
    if (!trendData || trendData.length === 0) return null;
    return {
      labels: trendData.map((d: any) => new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })),
      datasets: [{
        label: "Tỷ lệ lỗi (%)",
        data: trendData.map((d: any) => Number(d.defect_rate)),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.3,
      }],
    };
  }, [trendData]);

  const summaryStats = useMemo(() => {
    if (!defectSummary) return { totalDefects: 0, totalInspected: 0, avgRate: 0, topDefect: null };
    const totalDefects = defectSummary.reduce((sum: number, d: any) => sum + Number(d.total_count), 0);
    const totalInspected = defectSummary.reduce((sum: number, d: any) => sum + Number(d.total_inspected), 0);
    const avgRate = totalInspected > 0 ? (totalDefects / totalInspected) * 100 : 0;
    const topDefect = defectSummary[0];
    return { totalDefects, totalInspected, avgRate, topDefect };
  }, [defectSummary]);

  const handleExport = () => {
    if (!defectSummary) return;
    const csv = [
      ["Loại lỗi", "Mã", "Mức độ", "Số lượng", "Tổng kiểm tra", "Tỷ lệ %"].join(","),
      ...defectSummary.map((d: any) => [
        d.category_name, d.category_code, d.severity, d.total_count, d.total_inspected, d.defect_rate
      ].join(","))
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defect-distribution-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PieChart className="h-6 w-6 text-primary" />
              Phân tích Phân bố Loại lỗi
            </h1>
            <p className="text-muted-foreground">
              Phân tích chi tiết các loại lỗi phát hiện bởi AI Vision với biểu đồ Pareto
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchSummary()}>
              <RefreshCw className="h-4 w-4 mr-2" />Làm mới
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />Xuất CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label>Dây chuyền:</Label>
                <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                    {productionLines?.map((line: any) => (
                      <SelectItem key={line.id} value={String(line.id)}>{line.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>Khoảng thời gian:</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày qua</SelectItem>
                    <SelectItem value="14">14 ngày qua</SelectItem>
                    <SelectItem value="30">30 ngày qua</SelectItem>
                    <SelectItem value="60">60 ngày qua</SelectItem>
                    <SelectItem value="90">90 ngày qua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số lỗi</p>
                  <p className="text-2xl font-bold">{summaryStats.totalDefects.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                  <p className="text-2xl font-bold">{summaryStats.totalInspected.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ lỗi TB</p>
                  <p className="text-2xl font-bold">{summaryStats.avgRate.toFixed(2)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lỗi phổ biến nhất</p>
                  <p className="text-lg font-bold truncate">{summaryStats.topDefect?.category_name || "-"}</p>
                </div>
                <Badge variant="destructive">{summaryStats.topDefect?.total_count || 0}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="distribution"><PieChart className="h-4 w-4 mr-2" />Phân bố</TabsTrigger>
            <TabsTrigger value="pareto"><BarChart3 className="h-4 w-4 mr-2" />Pareto</TabsTrigger>
            <TabsTrigger value="trend"><TrendingUp className="h-4 w-4 mr-2" />Xu hướng</TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Biểu đồ tròn phân bố lỗi</CardTitle>
                  <CardDescription>Top 8 loại lỗi phổ biến nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  {paretoLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : pieChartData ? (
                    <div className="h-[300px]">
                      <Pie
                        data={pieChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { position: "right" },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => {
                                  const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                  const pct = ((ctx.raw as number) / total * 100).toFixed(1);
                                  return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Không có dữ liệu
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết phân bố</CardTitle>
                  <CardDescription>Thống kê theo từng loại lỗi</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại lỗi</TableHead>
                        <TableHead>Mức độ</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Tỷ lệ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : defectSummary?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">Không có dữ liệu</TableCell>
                        </TableRow>
                      ) : (
                        defectSummary?.slice(0, 10).map((d: any) => (
                          <TableRow key={d.category_id}>
                            <TableCell className="font-medium">{d.category_name}</TableCell>
                            <TableCell>
                              <Badge variant={d.severity === "high" ? "destructive" : d.severity === "medium" ? "secondary" : "outline"}>
                                {d.severity === "high" && "Cao"}
                                {d.severity === "medium" && "Trung bình"}
                                {d.severity === "low" && "Thấp"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{Number(d.total_count).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{d.defect_rate}%</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pareto" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Biểu đồ Pareto
                  <Badge variant="outline" className="font-normal">
                    <Info className="h-3 w-3 mr-1" />Quy tắc 80/20
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Phân tích Pareto giúp xác định 20% nguyên nhân gây ra 80% vấn đề
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paretoLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : paretoChartData ? (
                  <div className="h-[400px]">
                    <Bar
                      data={paretoChartData as any}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        scales: {
                          y: {
                            type: "linear",
                            position: "left",
                            title: { display: true, text: "Số lượng lỗi" },
                          },
                          y1: {
                            type: "linear",
                            position: "right",
                            min: 0,
                            max: 100,
                            title: { display: true, text: "Tích lũy %" },
                            grid: { drawOnChartArea: false },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
                
                {paretoData && paretoData.paretoData.length > 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Phân tích 80/20</h4>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const under80 = paretoData.paretoData.filter((d: any) => d.cumulative <= 80);
                        const pct = under80.length > 0 ? Math.round((under80.length / paretoData.paretoData.length) * 100) : 0;
                        return `${under80.length} loại lỗi (${pct}% tổng số loại) chiếm 80% tổng số lỗi. Tập trung cải thiện các loại lỗi này sẽ mang lại hiệu quả cao nhất.`;
                      })()}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {paretoData.paretoData.filter((d: any) => d.cumulative <= 80).map((d: any) => (
                        <Badge key={d.id} variant="secondary">{d.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng tỷ lệ lỗi theo thời gian</CardTitle>
                <CardDescription>Theo dõi biến động tỷ lệ lỗi trong {dateRange} ngày qua</CardDescription>
              </CardHeader>
              <CardContent>
                {trendLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : trendChartData ? (
                  <div className="h-[400px]">
                    <Line
                      data={trendChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: { display: true, text: "Tỷ lệ lỗi (%)" },
                          },
                        },
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Không có dữ liệu xu hướng
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
