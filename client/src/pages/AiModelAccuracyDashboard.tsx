import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Download,
  RefreshCw,
  Brain,
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28", "#FF8042"];

export default function AiModelAccuracyDashboard() {
  const [period, setPeriod] = useState("30");
  
  const { data: metrics, isLoading, refetch } = trpc.ai.export.getAccuracyMetrics.useQuery(
    { days: parseInt(period) },
    { refetchInterval: 60000 }
  );
  
  const { data: models } = trpc.ai.models.list.useQuery({ limit: 50 });
  
  const exportHtml = trpc.ai.export.exportAccuracyMetricsHtml.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Đã xuất báo cáo HTML thành công!");
    },
    onError: () => toast.error("Lỗi khi xuất báo cáo HTML"),
  });
  
  const exportExcel = trpc.ai.export.exportAccuracyMetricsExcel.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      link.click();
      toast.success("Đã xuất báo cáo Excel thành công!");
    },
    onError: () => toast.error("Lỗi khi xuất báo cáo Excel"),
  });

  // Prepare chart data
  const dailyChartData = useMemo(() => {
    if (!metrics?.dailyMetrics) return [];
    return metrics.dailyMetrics.map(d => ({
      date: d.date.split("-").slice(1).join("/"),
      cpk: d.cpkAccuracy,
      oee: d.oeeAccuracy,
      predictions: d.predictions,
    }));
  }, [metrics]);

  const modelComparisonData = useMemo(() => {
    if (!metrics?.modelMetrics) return [];
    return metrics.modelMetrics.slice(0, 8).map(m => ({
      name: m.modelName.length > 15 ? m.modelName.slice(0, 15) + "..." : m.modelName,
      accuracy: m.accuracy,
      precision: m.precision * 100,
      recall: m.recall * 100,
      f1: m.f1Score * 100,
    }));
  }, [metrics]);

  const radarData = useMemo(() => {
    if (!metrics?.modelMetrics || metrics.modelMetrics.length === 0) return [];
    const topModels = metrics.modelMetrics.slice(0, 3);
    return [
      { metric: "Accuracy", ...Object.fromEntries(topModels.map((m, i) => [`model${i}`, m.accuracy])) },
      { metric: "Precision", ...Object.fromEntries(topModels.map((m, i) => [`model${i}`, m.precision * 100])) },
      { metric: "Recall", ...Object.fromEntries(topModels.map((m, i) => [`model${i}`, m.recall * 100])) },
      { metric: "F1 Score", ...Object.fromEntries(topModels.map((m, i) => [`model${i}`, m.f1Score * 100])) },
    ];
  }, [metrics]);

  const pieData = useMemo(() => {
    if (!metrics?.modelMetrics) return [];
    const byType = new Map<string, number>();
    metrics.modelMetrics.forEach(m => {
      byType.set(m.modelType, (byType.get(m.modelType) || 0) + 1);
    });
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value }));
  }, [metrics]);

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy >= 85) return { color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle, label: "Tốt" };
    if (accuracy >= 70) return { color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: AlertTriangle, label: "Trung bình" };
    return { color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle, label: "Cần cải thiện" };
  };

  const getTrendIcon = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 1) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (diff < -1) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const cpkStatus = getAccuracyStatus(metrics?.overallMetrics.cpkAccuracy || 0);
  const oeeStatus = getAccuracyStatus(metrics?.overallMetrics.oeeAccuracy || 0);
  const trendStatus = getAccuracyStatus(metrics?.overallMetrics.trendAccuracy || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-500" />
              AI Model Accuracy Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              So sánh và phân tích độ chính xác của các model AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Chọn kỳ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="60">60 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => exportHtml.mutate({ days: parseInt(period) })}
              disabled={exportHtml.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={() => exportExcel.mutate({ days: parseInt(period) })}
              disabled={exportExcel.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className={cpkStatus.bg}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPK Accuracy</p>
                  <p className={`text-3xl font-bold ${cpkStatus.color}`}>
                    {metrics?.overallMetrics.cpkAccuracy.toFixed(1)}%
                  </p>
                </div>
                <cpkStatus.icon className={`h-8 w-8 ${cpkStatus.color}`} />
              </div>
              <Badge variant="outline" className="mt-2">{cpkStatus.label}</Badge>
            </CardContent>
          </Card>

          <Card className={oeeStatus.bg}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE Accuracy</p>
                  <p className={`text-3xl font-bold ${oeeStatus.color}`}>
                    {metrics?.overallMetrics.oeeAccuracy.toFixed(1)}%
                  </p>
                </div>
                <oeeStatus.icon className={`h-8 w-8 ${oeeStatus.color}`} />
              </div>
              <Badge variant="outline" className="mt-2">{oeeStatus.label}</Badge>
            </CardContent>
          </Card>

          <Card className={trendStatus.bg}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trend Accuracy</p>
                  <p className={`text-3xl font-bold ${trendStatus.color}`}>
                    {metrics?.overallMetrics.trendAccuracy.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${trendStatus.color}`} />
              </div>
              <Badge variant="outline" className="mt-2">{trendStatus.label}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Predictions</p>
                  <p className="text-3xl font-bold text-blue-500">
                    {metrics?.overallMetrics.totalPredictions || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics?.overallMetrics.correctPredictions || 0} correct
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Models</p>
                  <p className="text-3xl font-bold text-purple-500">
                    {models?.models?.filter(m => m.status === "active").length || 0}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                / {models?.models?.length || 0} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="comparison">So sánh Model</TabsTrigger>
            <TabsTrigger value="radar">Radar Chart</TabsTrigger>
            <TabsTrigger value="distribution">Phân bố</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng Accuracy theo thời gian</CardTitle>
                <CardDescription>
                  CPK và OEE Accuracy trong {period} ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cpk"
                        name="CPK Accuracy"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="oee"
                        name="OEE Accuracy"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>So sánh Accuracy giữa các Model</CardTitle>
                <CardDescription>
                  Top 8 models theo các chỉ số đánh giá
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" name="Accuracy" fill="#8884d8" />
                      <Bar dataKey="precision" name="Precision" fill="#82ca9d" />
                      <Bar dataKey="recall" name="Recall" fill="#ffc658" />
                      <Bar dataKey="f1" name="F1 Score" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="radar">
            <Card>
              <CardHeader>
                <CardTitle>Radar Chart - Top 3 Models</CardTitle>
                <CardDescription>
                  So sánh đa chiều các chỉ số của top 3 models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {metrics?.modelMetrics?.slice(0, 3).map((m, i) => (
                        <Radar
                          key={m.modelId}
                          name={m.modelName}
                          dataKey={`model${i}`}
                          stroke={COLORS[i]}
                          fill={COLORS[i]}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo loại Model</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Predictions theo ngày</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyChartData.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="predictions" name="Predictions" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Model Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết Accuracy theo Model</CardTitle>
            <CardDescription>
              Bảng chi tiết các chỉ số đánh giá của từng model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Model</th>
                    <th className="text-left p-3 font-medium">Loại</th>
                    <th className="text-right p-3 font-medium">Accuracy</th>
                    <th className="text-right p-3 font-medium">Precision</th>
                    <th className="text-right p-3 font-medium">Recall</th>
                    <th className="text-right p-3 font-medium">F1 Score</th>
                    <th className="text-right p-3 font-medium">Predictions</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.modelMetrics?.map((model) => {
                    const status = getAccuracyStatus(model.accuracy);
                    return (
                      <tr key={model.modelId} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{model.modelName}</td>
                        <td className="p-3">
                          <Badge variant="outline">{model.modelType}</Badge>
                        </td>
                        <td className={`p-3 text-right font-bold ${status.color}`}>
                          {model.accuracy.toFixed(1)}%
                        </td>
                        <td className="p-3 text-right">{model.precision.toFixed(4)}</td>
                        <td className="p-3 text-right">{model.recall.toFixed(4)}</td>
                        <td className="p-3 text-right">{model.f1Score.toFixed(4)}</td>
                        <td className="p-3 text-right">
                          {model.totalPredictions}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({model.correctPredictions} correct)
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={status.bg} variant="outline">
                            <status.icon className={`h-3 w-3 mr-1 ${status.color}`} />
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
