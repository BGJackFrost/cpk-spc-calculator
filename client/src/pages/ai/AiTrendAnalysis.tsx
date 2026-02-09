import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Download, Brain, AlertTriangle, CheckCircle, Target, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, ReferenceLine } from "recharts";

// Mock trend data
// Mock data removed - mockTrendData (data comes from tRPC or is not yet implemented)

export default function AiTrendAnalysis() {
  const { toast } = useToast();
  const [metric, setMetric] = useState("cpk");
  const [timeRange, setTimeRange] = useState("30d");
  const [forecastDays, setForecastDays] = useState("7");

  const handleAnalyze = () => {
    toast({ title: "Đang phân tích", description: "Đang phân tích xu hướng với AI..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã phân tích xu hướng thành công" });
    }, 1500);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "down": return <TrendingDown className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              AI Trend Analysis
            </h1>
            <p className="text-muted-foreground mt-1">Phân tích và dự báo xu hướng với AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpk">CPK</SelectItem>
                <SelectItem value="oee">OEE</SelectItem>
                <SelectItem value="defect">Tỷ lệ lỗi</SelectItem>
                <SelectItem value="yield">Năng suất</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAnalyze}>
              <RefreshCw className="w-4 h-4 mr-2" />Phân tích
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Xu hướng</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon(mockTrendData.summary.currentTrend)}
                    <span className="text-xl font-bold capitalize">
                      {mockTrendData.summary.currentTrend === "up" ? "Tăng" : mockTrendData.summary.currentTrend === "down" ? "Giảm" : "Ổn định"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Độ mạnh xu hướng</p>
              <p className="text-2xl font-bold">{(mockTrendData.summary.trendStrength * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Độ chính xác dự báo</p>
              <p className="text-2xl font-bold text-green-600">{(mockTrendData.summary.forecastAccuracy * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Điểm bất thường</p>
              <p className="text-2xl font-bold text-orange-600">{mockTrendData.summary.anomalyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tính mùa vụ</p>
              <p className="text-2xl font-bold">{(mockTrendData.summary.seasonalStrength * 100).toFixed(0)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-blue-500" />AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {mockTrendData.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                  {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                  {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                  {insight.type === "info" && <Brain className="w-4 h-4 text-blue-500 mt-0.5" />}
                  <span className="text-sm">{insight.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">Dự báo</TabsTrigger>
            <TabsTrigger value="seasonal">Mẫu theo mùa</TabsTrigger>
            <TabsTrigger value="anomalies">Điểm bất thường</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dự báo xu hướng CPK</CardTitle>
                    <CardDescription>Giá trị thực tế và dự báo với khoảng tin cậy 95%</CardDescription>
                  </div>
                  <Select value={forecastDays} onValueChange={setForecastDays}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 ngày tới</SelectItem>
                      <SelectItem value="14">14 ngày tới</SelectItem>
                      <SelectItem value="30">30 ngày tới</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mockTrendData.cpkTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[1.0, 1.6]} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="5 5" label="Mục tiêu" />
                      <Area type="monotone" dataKey="upper" stackId="1" stroke="none" fill="#3b82f6" fillOpacity={0.1} name="Giới hạn trên" />
                      <Area type="monotone" dataKey="lower" stackId="2" stroke="none" fill="#fff" name="Giới hạn dưới" />
                      <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeDasharray="5 5" name="Dự báo" strokeWidth={2} />
                      <Line type="monotone" dataKey="actual" stroke="#8b5cf6" name="Thực tế" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seasonal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mẫu theo thời gian trong ngày</CardTitle>
                <CardDescription>CPK trung bình và độ lệch chuẩn theo giờ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mockTrendData.seasonalPattern}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="std" fill="#e2e8f0" name="Độ lệch chuẩn" />
                      <Line type="monotone" dataKey="avg" stroke="#8b5cf6" name="CPK trung bình" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Điểm bất thường phát hiện</CardTitle>
                <CardDescription>Các điểm dữ liệu bất thường được AI phát hiện</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTrendData.anomalies.map((anomaly, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${anomaly.type === "drop" ? "bg-red-100" : "bg-orange-100"}`}>
                          {anomaly.type === "drop" ? (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{anomaly.date} - CPK: {anomaly.value}</p>
                          <p className="text-sm text-muted-foreground">Nguyên nhân: {anomaly.cause}</p>
                        </div>
                      </div>
                      <Badge className={anomaly.severity === "high" ? "bg-red-500" : "bg-orange-500"}>
                        {anomaly.severity === "high" ? "Nghiêm trọng" : "Trung bình"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
