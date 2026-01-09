import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, 
  Calendar, RefreshCw, Loader2, BarChart3, Activity, Target
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler
);

export default function TrendComparison() {
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [comparisonType, setComparisonType] = useState<"cpk" | "defect_rate" | "oee" | "quality_score">("cpk");
  const [activeTab, setActiveTab] = useState("weekly");

  const { data: productionLines } = trpc.productionLine.list.useQuery();
  
  const { data: weeklyComparison, isLoading: weeklyLoading, refetch: refetchWeekly } = 
    trpc.defectAnalytics.getWeeklyComparison.useQuery({
      comparisonType,
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
    });

  const { data: monthlyComparison, isLoading: monthlyLoading, refetch: refetchMonthly } = 
    trpc.defectAnalytics.getMonthlyComparison.useQuery({
      comparisonType,
      productionLineId: selectedLineId !== "all" ? parseInt(selectedLineId) : undefined,
    });

  const handleRefresh = () => {
    refetchWeekly();
    refetchMonthly();
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (trend === "declining") return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "improving") return "text-green-600 bg-green-50";
    if (trend === "declining") return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "improving") return "Cải thiện";
    if (trend === "declining") return "Suy giảm";
    return "Ổn định";
  };

  const getMetricLabel = (type: string) => {
    switch (type) {
      case "cpk": return "CPK";
      case "defect_rate": return "Tỷ lệ lỗi";
      case "oee": return "OEE";
      case "quality_score": return "Điểm chất lượng";
      default: return type;
    }
  };

  const getMetricUnit = (type: string) => {
    switch (type) {
      case "cpk": return "";
      case "defect_rate": return "%";
      case "oee": return "%";
      case "quality_score": return "%";
      default: return "";
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type === "cpk") return value.toFixed(2);
    return value.toFixed(2) + "%";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const ComparisonCard = ({ data, title, isLoading }: { data: any; title: string; isLoading: boolean }) => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      );
    }

    if (!data) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
            Không có dữ liệu
          </CardContent>
        </Card>
      );
    }

    const chartData = {
      labels: ["Kỳ trước", "Kỳ hiện tại"],
      datasets: [{
        label: getMetricLabel(comparisonType),
        data: [data.previousValue, data.currentValue],
        backgroundColor: [
          "rgba(156, 163, 175, 0.7)",
          data.trend === "improving" ? "rgba(34, 197, 94, 0.7)" : 
          data.trend === "declining" ? "rgba(239, 68, 68, 0.7)" : "rgba(59, 130, 246, 0.7)"
        ],
        borderColor: [
          "rgba(156, 163, 175, 1)",
          data.trend === "improving" ? "rgba(34, 197, 94, 1)" : 
          data.trend === "declining" ? "rgba(239, 68, 68, 1)" : "rgba(59, 130, 246, 1)"
        ],
        borderWidth: 1,
      }],
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge className={getTrendColor(data.trend)}>
              {getTrendIcon(data.trend)}
              <span className="ml-1">{getTrendLabel(data.trend)}</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            So sánh {getMetricLabel(comparisonType)} giữa hai kỳ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Kỳ trước</p>
              <p className="text-xs text-muted-foreground mb-2">
                {formatDate(data.previousPeriodStart)} - {formatDate(data.previousPeriodEnd)}
              </p>
              <p className="text-2xl font-bold">{formatValue(data.previousValue, comparisonType)}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.previousSampleCount} mẫu</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Kỳ hiện tại</p>
              <p className="text-xs text-muted-foreground mb-2">
                {formatDate(data.currentPeriodStart)} - {formatDate(data.currentPeriodEnd)}
              </p>
              <p className="text-2xl font-bold">{formatValue(data.currentValue, comparisonType)}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.currentSampleCount} mẫu</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Thay đổi tuyệt đối</p>
              <p className={`text-xl font-bold flex items-center justify-center ${
                data.absoluteChange > 0 ? "text-green-600" : data.absoluteChange < 0 ? "text-red-600" : ""
              }`}>
                {data.absoluteChange > 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                 data.absoluteChange < 0 ? <ArrowDownRight className="h-4 w-4 mr-1" /> : null}
                {data.absoluteChange > 0 ? "+" : ""}{data.absoluteChange.toFixed(2)}{getMetricUnit(comparisonType)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Thay đổi %</p>
              <p className={`text-xl font-bold flex items-center justify-center ${
                data.percentChange > 0 ? "text-green-600" : data.percentChange < 0 ? "text-red-600" : ""
              }`}>
                {data.percentChange > 0 ? <ArrowUpRight className="h-4 w-4 mr-1" /> : 
                 data.percentChange < 0 ? <ArrowDownRight className="h-4 w-4 mr-1" /> : null}
                {data.percentChange > 0 ? "+" : ""}{data.percentChange.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Mức độ</p>
              <Badge variant={data.significance === "significant" ? "default" : "secondary"}>
                {data.significance === "significant" ? "Có ý nghĩa" : "Không đáng kể"}
              </Badge>
            </div>
          </div>

          <div className="h-[200px]">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: comparisonType !== "cpk",
                    title: { display: true, text: getMetricLabel(comparisonType) },
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              So sánh Trend theo Thời gian
            </h1>
            <p className="text-muted-foreground">
              So sánh các chỉ số chất lượng giữa các khoảng thời gian
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />Làm mới
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <Label>Chỉ số:</Label>
                <Select value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpk">CPK</SelectItem>
                    <SelectItem value="defect_rate">Tỷ lệ lỗi</SelectItem>
                    <SelectItem value="oee">OEE</SelectItem>
                    <SelectItem value="quality_score">Điểm chất lượng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`cursor-pointer transition-all ${activeTab === "weekly" ? "ring-2 ring-primary" : ""}`} onClick={() => setActiveTab("weekly")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">So sánh tuần</p>
                  <p className="text-lg font-semibold">Tuần này vs Tuần trước</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
              {weeklyComparison && (
                <div className="mt-2 flex items-center gap-2">
                  {getTrendIcon(weeklyComparison.trend)}
                  <span className={weeklyComparison.percentChange > 0 ? "text-green-600" : weeklyComparison.percentChange < 0 ? "text-red-600" : ""}>
                    {weeklyComparison.percentChange > 0 ? "+" : ""}{weeklyComparison.percentChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${activeTab === "monthly" ? "ring-2 ring-primary" : ""}`} onClick={() => setActiveTab("monthly")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">So sánh tháng</p>
                  <p className="text-lg font-semibold">Tháng này vs Tháng trước</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
              {monthlyComparison && (
                <div className="mt-2 flex items-center gap-2">
                  {getTrendIcon(monthlyComparison.trend)}
                  <span className={monthlyComparison.percentChange > 0 ? "text-green-600" : monthlyComparison.percentChange < 0 ? "text-red-600" : ""}>
                    {monthlyComparison.percentChange > 0 ? "+" : ""}{monthlyComparison.percentChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng quan</p>
                  <p className="text-lg font-semibold">Xu hướng chung</p>
                </div>
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-2">
                {weeklyComparison && monthlyComparison && (
                  <Badge className={
                    weeklyComparison.trend === "improving" && monthlyComparison.trend === "improving" 
                      ? "bg-green-100 text-green-700"
                      : weeklyComparison.trend === "declining" && monthlyComparison.trend === "declining"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }>
                    {weeklyComparison.trend === "improving" && monthlyComparison.trend === "improving" 
                      ? "Đang cải thiện liên tục"
                      : weeklyComparison.trend === "declining" && monthlyComparison.trend === "declining"
                      ? "Cần chú ý - Suy giảm"
                      : "Biến động - Cần theo dõi"}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="weekly"><Calendar className="h-4 w-4 mr-2" />So sánh tuần</TabsTrigger>
            <TabsTrigger value="monthly"><Calendar className="h-4 w-4 mr-2" />So sánh tháng</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4">
            <ComparisonCard data={weeklyComparison} title="So sánh Tuần này vs Tuần trước" isLoading={weeklyLoading} />
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <ComparisonCard data={monthlyComparison} title="So sánh Tháng này vs Tháng trước" isLoading={monthlyLoading} />
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn đọc kết quả</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Cải thiện</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {comparisonType === "defect_rate" 
                    ? "Tỷ lệ lỗi giảm so với kỳ trước."
                    : "Chỉ số tăng so với kỳ trước."}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Minus className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold">Ổn định</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Thay đổi dưới 5%, quá trình đang ổn định.
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="font-semibold">Suy giảm</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {comparisonType === "defect_rate"
                    ? "Tỷ lệ lỗi tăng, cần điều tra."
                    : "Chỉ số giảm, cần điều tra."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
