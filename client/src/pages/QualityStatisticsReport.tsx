import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
  LineChart,
  Factory,
  Package,
  Calendar,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function QualityStatisticsReport() {
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [periods, setPeriods] = useState(30);
  const [productionLineId, setProductionLineId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: string;

    switch (periodType) {
      case "daily":
        startDate = new Date(now.getTime() - periods * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "weekly":
        startDate = new Date(now.getTime() - periods * 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth() - periods, 1).toISOString();
        break;
    }

    return { startDate, endDate: now.toISOString() };
  }, [periodType, periods]);

  // Queries
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();

  const { data: statistics, isLoading: statsLoading } = trpc.qualityStatistics.getStatistics.useQuery({
    periodType,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    productionLineId: productionLineId ? parseInt(productionLineId) : undefined,
    productId: productId ? parseInt(productId) : undefined,
  });

  const { data: trendData, isLoading: trendLoading } = trpc.qualityStatistics.getTrendData.useQuery({
    periodType,
    periods,
    productionLineId: productionLineId ? parseInt(productionLineId) : undefined,
    productId: productId ? parseInt(productId) : undefined,
  });

  const { data: lineComparison } = trpc.qualityStatistics.getLineComparison.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    productId: productId ? parseInt(productId) : undefined,
  });

  const { data: productComparison } = trpc.qualityStatistics.getProductComparison.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    productionLineId: productionLineId ? parseInt(productionLineId) : undefined,
  });

  const { data: defectDistribution } = trpc.qualityStatistics.getDefectDistribution.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    productionLineId: productionLineId ? parseInt(productionLineId) : undefined,
    productId: productId ? parseInt(productId) : undefined,
  });

  const { data: cpkTrend } = trpc.qualityStatistics.getCpkTrend.useQuery({
    periodType,
    periods,
    productionLineId: productionLineId ? parseInt(productionLineId) : undefined,
  });

  // Chart configurations
  const trendChartData = useMemo(() => {
    if (!trendData) return null;

    return {
      labels: trendData.map((d) => d.date),
      datasets: [
        {
          label: "Tỷ lệ OK (%)",
          data: trendData.map((d) => d.okRate),
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Điểm chất lượng TB",
          data: trendData.map((d) => d.avgQualityScore),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: false,
          tension: 0.3,
        },
      ],
    };
  }, [trendData]);

  const sampleCountChartData = useMemo(() => {
    if (!trendData) return null;

    return {
      labels: trendData.map((d) => d.date),
      datasets: [
        {
          label: "OK",
          data: trendData.map((d) => d.okCount),
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
        {
          label: "NG",
          data: trendData.map((d) => d.ngCount),
          backgroundColor: "rgba(239, 68, 68, 0.8)",
        },
      ],
    };
  }, [trendData]);

  const lineComparisonChartData = useMemo(() => {
    if (!lineComparison || lineComparison.length === 0) return null;

    return {
      labels: lineComparison.map((d) => d.lineName),
      datasets: [
        {
          label: "Tỷ lệ OK (%)",
          data: lineComparison.map((d) => d.okRate),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(168, 85, 247, 0.8)",
            "rgba(249, 115, 22, 0.8)",
            "rgba(236, 72, 153, 0.8)",
          ],
        },
      ],
    };
  }, [lineComparison]);

  const productComparisonChartData = useMemo(() => {
    if (!productComparison || productComparison.length === 0) return null;

    return {
      labels: productComparison.map((d) => d.productName),
      datasets: [
        {
          label: "Tỷ lệ OK (%)",
          data: productComparison.map((d) => d.okRate),
          backgroundColor: "rgba(59, 130, 246, 0.8)",
        },
        {
          label: "Điểm chất lượng TB",
          data: productComparison.map((d) => d.avgQualityScore),
          backgroundColor: "rgba(34, 197, 94, 0.8)",
        },
      ],
    };
  }, [productComparison]);

  const defectPieChartData = useMemo(() => {
    if (!defectDistribution || defectDistribution.length === 0) return null;

    const colors = [
      "rgba(239, 68, 68, 0.8)",
      "rgba(249, 115, 22, 0.8)",
      "rgba(234, 179, 8, 0.8)",
      "rgba(34, 197, 94, 0.8)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(168, 85, 247, 0.8)",
      "rgba(236, 72, 153, 0.8)",
    ];

    return {
      labels: defectDistribution.map((d) => d.type),
      datasets: [
        {
          data: defectDistribution.map((d) => d.count),
          backgroundColor: colors.slice(0, defectDistribution.length),
        },
      ],
    };
  }, [defectDistribution]);

  const cpkTrendChartData = useMemo(() => {
    if (!cpkTrend) return null;

    return {
      labels: cpkTrend.map((d) => d.date),
      datasets: [
        {
          label: "CPK Trung bình",
          data: cpkTrend.map((d) => d.avgCpk),
          borderColor: "rgb(168, 85, 247)",
          backgroundColor: "rgba(168, 85, 247, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "CPK Min",
          data: cpkTrend.map((d) => d.minCpk),
          borderColor: "rgb(239, 68, 68)",
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
        },
        {
          label: "CPK Max",
          data: cpkTrend.map((d) => d.maxCpk),
          borderColor: "rgb(34, 197, 94)",
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
        },
      ],
    };
  }, [cpkTrend]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo Thống kê Chất lượng</h1>
            <p className="text-muted-foreground">
              Phân tích xu hướng chất lượng theo sản phẩm và dây chuyền sản xuất
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Chu kỳ</Label>
                <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Theo ngày</SelectItem>
                    <SelectItem value="weekly">Theo tuần</SelectItem>
                    <SelectItem value="monthly">Theo tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Số chu kỳ</Label>
                <Select value={String(periods)} onValueChange={(v) => setPeriods(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7</SelectItem>
                    <SelectItem value="14">14</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dây chuyền</Label>
                <Select value={productionLineId} onValueChange={setProductionLineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sản phẩm</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tổng mẫu</p>
                  <p className="text-2xl font-bold">{statistics.totalSamples}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tỷ lệ OK</p>
                  <p className="text-2xl font-bold text-green-500">
                    {statistics.okRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tỷ lệ NG</p>
                  <p className="text-2xl font-bold text-red-500">
                    {statistics.ngRate.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Điểm TB</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {statistics.avgQualityScore.toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Độ lệch chuẩn</p>
                  <p className="text-2xl font-bold">
                    {statistics.stdDevQualityScore.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Tổng lỗi</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {statistics.totalDefects}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <Tabs defaultValue="trend">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="trend" className="flex items-center gap-1">
              <LineChart className="h-4 w-4" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="samples" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Số lượng
            </TabsTrigger>
            <TabsTrigger value="lines" className="flex items-center gap-1">
              <Factory className="h-4 w-4" />
              Dây chuyền
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Sản phẩm
            </TabsTrigger>
            <TabsTrigger value="cpk" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              CPK
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng chất lượng</CardTitle>
                  <CardDescription>Tỷ lệ OK và điểm chất lượng trung bình theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {trendLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : trendChartData ? (
                      <Line data={trendChartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bố lỗi</CardTitle>
                  <CardDescription>Tỷ lệ các loại lỗi phát hiện được</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {defectPieChartData ? (
                      <Doughnut data={defectPieChartData} options={pieChartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Không có dữ liệu lỗi
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="samples" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Số lượng mẫu theo thời gian</CardTitle>
                <CardDescription>Phân bố OK/NG theo từng chu kỳ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {sampleCountChartData ? (
                    <Bar
                      data={sampleCountChartData}
                      options={{
                        ...chartOptions,
                        scales: {
                          ...chartOptions.scales,
                          x: { stacked: true },
                          y: { stacked: true },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Không có dữ liệu
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lines" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>So sánh dây chuyền</CardTitle>
                  <CardDescription>Tỷ lệ OK theo từng dây chuyền sản xuất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {lineComparisonChartData ? (
                      <Bar data={lineComparisonChartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết dây chuyền</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lineComparison?.map((line) => (
                      <div
                        key={line.lineId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{line.lineName}</p>
                          <p className="text-sm text-muted-foreground">
                            {line.totalSamples} mẫu
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-500">
                            {line.okRate.toFixed(1)}% OK
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Điểm TB: {line.avgQualityScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!lineComparison || lineComparison.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>So sánh sản phẩm</CardTitle>
                  <CardDescription>Tỷ lệ OK và điểm chất lượng theo sản phẩm</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {productComparisonChartData ? (
                      <Bar data={productComparisonChartData} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết sản phẩm</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {productComparison?.map((product) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.productCode} • {product.totalSamples} mẫu
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-500">
                            {product.okRate.toFixed(1)}% OK
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Điểm TB: {product.avgQualityScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!productComparison || productComparison.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cpk" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng CPK</CardTitle>
                <CardDescription>
                  Theo dõi chỉ số năng lực quy trình theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  {cpkTrendChartData ? (
                    <Line
                      data={cpkTrendChartData}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          annotation: {
                            annotations: {
                              line1: {
                                type: "line",
                                yMin: 1.33,
                                yMax: 1.33,
                                borderColor: "rgb(34, 197, 94)",
                                borderWidth: 2,
                                borderDash: [10, 5],
                                label: {
                                  content: "CPK = 1.33 (Mục tiêu)",
                                  enabled: true,
                                },
                              },
                              line2: {
                                type: "line",
                                yMin: 1.0,
                                yMax: 1.0,
                                borderColor: "rgb(249, 115, 22)",
                                borderWidth: 2,
                                borderDash: [10, 5],
                              },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Không có dữ liệu CPK
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Defect Types */}
        {statistics && statistics.topDefectTypes && statistics.topDefectTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top loại lỗi phổ biến</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {statistics.topDefectTypes.map((defect: any, index: number) => (
                  <div
                    key={defect.type}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{
                        backgroundColor: [
                          "#ef4444",
                          "#f97316",
                          "#eab308",
                          "#22c55e",
                          "#3b82f6",
                        ][index],
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{defect.type}</p>
                      <p className="text-xs text-muted-foreground">{defect.count} lỗi</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
