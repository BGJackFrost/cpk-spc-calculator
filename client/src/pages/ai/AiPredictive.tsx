import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Activity, AlertTriangle, Target,
  Calendar, BarChart3, RefreshCw, Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, AreaChart, Area, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

export default function AiPredictive() {
  const { toast } = useToast();
  const [selectedLine, setSelectedLine] = useState("line1");
  const [forecastHorizon, setForecastHorizon] = useState("7d");
  const [algorithm, setAlgorithm] = useState("lstm");

  // Mock data
  const historicalData = [
    { date: "W1", actual: 1.45, predicted: null },
    { date: "W2", actual: 1.52, predicted: null },
    { date: "W3", actual: 1.48, predicted: null },
    { date: "W4", actual: 1.55, predicted: null },
    { date: "W5", actual: 1.51, predicted: null },
    { date: "W6", actual: 1.58, predicted: null },
    { date: "W7", actual: 1.54, predicted: null },
    { date: "W8", actual: 1.62, predicted: null },
  ];

  const forecastData = [
    { date: "W8", actual: 1.62, predicted: 1.62, lower: 1.58, upper: 1.66 },
    { date: "W9", actual: null, predicted: 1.65, lower: 1.59, upper: 1.71 },
    { date: "W10", actual: null, predicted: 1.68, lower: 1.60, upper: 1.76 },
    { date: "W11", actual: null, predicted: 1.70, lower: 1.61, upper: 1.79 },
    { date: "W12", actual: null, predicted: 1.72, lower: 1.62, upper: 1.82 },
  ];

  const combinedData = [...historicalData.slice(-4), ...forecastData];

  const metrics = [
    { name: "Dự báo trung bình", value: "1.69", trend: "up", change: "+4.3%" },
    { name: "Độ tin cậy", value: "92%", trend: "up", change: "+2%" },
    { name: "RMSE", value: "0.08", trend: "down", change: "-15%" },
    { name: "MAE", value: "0.06", trend: "down", change: "-12%" },
  ];

  const algorithms = [
    { id: "lstm", name: "LSTM Neural Network", accuracy: 92, description: "Deep learning cho time series" },
    { id: "prophet", name: "Facebook Prophet", accuracy: 89, description: "Phát hiện seasonality tốt" },
    { id: "arima", name: "ARIMA", accuracy: 85, description: "Mô hình thống kê cổ điển" },
    { id: "xgboost", name: "XGBoost", accuracy: 88, description: "Ensemble learning mạnh mẽ" },
  ];

  const alerts = [
    { id: 1, type: "warning", message: "CPK dự báo giảm xuống dưới 1.33 trong 2 tuần tới", date: "W10" },
    { id: 2, type: "info", message: "Xu hướng tăng dần, có thể đạt 1.67 trong 4 tuần", date: "W12" },
  ];

  const productionLines = [
    { id: "line1", name: "Dây chuyền 1", currentCpk: 1.62, trend: "up" },
    { id: "line2", name: "Dây chuyền 2", currentCpk: 1.45, trend: "down" },
    { id: "line3", name: "Dây chuyền 3", currentCpk: 1.58, trend: "stable" },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Target className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              CPK Forecast
            </h1>
            <p className="text-muted-foreground mt-1">
              Dự báo CPK với AI/ML - Phát hiện xu hướng và cảnh báo sớm
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Đang tải lại dữ liệu..." })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Đang xuất báo cáo..." })}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình dự báo</CardTitle>
            <CardDescription>Chọn dây chuyền, thuật toán và khoảng thời gian dự báo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dây chuyền</label>
                <Select value={selectedLine} onValueChange={setSelectedLine}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines.map((line) => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.name} (CPK: {line.currentCpk})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Thuật toán</label>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithms.map((algo) => (
                      <SelectItem key={algo.id} value={algo.id}>
                        {algo.name} ({algo.accuracy}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Khoảng dự báo</label>
                <Select value={forecastHorizon} onValueChange={setForecastHorizon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">1 tuần</SelectItem>
                    <SelectItem value="14d">2 tuần</SelectItem>
                    <SelectItem value="30d">1 tháng</SelectItem>
                    <SelectItem value="90d">3 tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className={`text-3xl font-bold ${getTrendColor(metric.trend)}`}>{metric.value}</p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm ${getTrendColor(metric.trend)}`}>{metric.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Forecast Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Biểu đồ dự báo CPK
            </CardTitle>
            <CardDescription>
              Dữ liệu lịch sử và dự báo với khoảng tin cậy 95%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[1.0, 2.0]} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={1.33} stroke="#ef4444" strokeDasharray="3 3" label="Min CPK" />
                <ReferenceLine y={1.67} stroke="#10b981" strokeDasharray="3 3" label="Target CPK" />
                
                {/* Confidence interval */}
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#3b82f6" 
                  fillOpacity={0.1} 
                  name="Khoảng tin cậy"
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="none" 
                  fill="#ffffff" 
                  fillOpacity={1} 
                />
                
                {/* Actual and predicted */}
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 4 }} 
                  name="Thực tế"
                />
                <Line 
                  type="monotone" 
                  dataKey="predicted" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  dot={{ r: 4 }} 
                  name="Dự báo"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alerts & Algorithm Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Cảnh báo dự báo
              </CardTitle>
              <CardDescription>Các cảnh báo dựa trên kết quả dự báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {alert.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-500" />
                Thuật toán đang sử dụng
              </CardTitle>
              <CardDescription>Thông tin về mô hình dự báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {algorithms.find((a) => a.id === algorithm) && (
                  <>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-violet-50 dark:bg-violet-950">
                      <div>
                        <p className="font-medium">{algorithms.find((a) => a.id === algorithm)?.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {algorithms.find((a) => a.id === algorithm)?.description}
                        </p>
                      </div>
                      <Badge className="bg-violet-500">
                        {algorithms.find((a) => a.id === algorithm)?.accuracy}%
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Training data</span>
                        <span className="text-sm font-medium">8 tuần lịch sử</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Update frequency</span>
                        <span className="text-sm font-medium">Hàng ngày</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last trained</span>
                        <span className="text-sm font-medium">2 giờ trước</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Production Lines Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Tổng quan các dây chuyền</CardTitle>
            <CardDescription>CPK hiện tại và xu hướng dự báo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productionLines.map((line) => (
                <div key={line.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(line.trend)}
                      <div>
                        <p className="font-medium">{line.name}</p>
                        <p className="text-sm text-muted-foreground">CPK hiện tại: {line.currentCpk}</p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedLine(line.id);
                      toast({ title: "Đã chuyển sang " + line.name });
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
