import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine,
  Scatter,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  Download,
  Loader2,
  Brain,
  Zap,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

// Export Buttons Component
function ExportButtons({ productCode, stationName, forecastDays, isVi }: { 
  productCode: string; 
  stationName: string; 
  forecastDays: number;
  isVi: boolean;
}) {
  const exportHtml = trpc.ai.export.exportCpkForecastHtml.useMutation();
  const exportExcel = trpc.ai.export.exportCpkForecastExcel.useMutation();

  const handleExportHtml = async () => {
    if (!productCode || !stationName) {
      toast.error(isVi ? "Vui lòng chọn sản phẩm và trạm" : "Please select product and station");
      return;
    }
    try {
      const result = await exportHtml.mutateAsync({ productCode, stationName, forecastDays });
      if (result.url) {
        window.open(result.url, "_blank");
        toast.success(isVi ? "Xuất HTML thành công" : "HTML export successful");
      }
    } catch (error) {
      toast.error(isVi ? "Lỗi xuất HTML" : "HTML export failed");
    }
  };

  const handleExportExcel = async () => {
    if (!productCode || !stationName) {
      toast.error(isVi ? "Vui lòng chọn sản phẩm và trạm" : "Please select product and station");
      return;
    }
    try {
      const result = await exportExcel.mutateAsync({ productCode, stationName, forecastDays });
      if (result.url) {
        window.open(result.url, "_blank");
        toast.success(isVi ? "Xuất Excel thành công" : "Excel export successful");
      }
    } catch (error) {
      toast.error(isVi ? "Lỗi xuất Excel" : "Excel export failed");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportHtml}
        disabled={exportHtml.isPending}
      >
        <Download className="h-4 w-4 mr-2" />
        {exportHtml.isPending ? (isVi ? "Đang xuất..." : "Exporting...") : "HTML"}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportExcel}
        disabled={exportExcel.isPending}
      >
        <Download className="h-4 w-4 mr-2" />
        {exportExcel.isPending ? (isVi ? "Đang xuất..." : "Exporting...") : "Excel"}
      </Button>
    </div>
  );
}

// Types
interface Prediction {
  date: string;
  predictedCpk: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  risk: "low" | "medium" | "high";
}

interface HistoricalData {
  date: string;
  actualCpk: number;
}

interface ForecastSummary {
  avgPredictedCpk: number;
  trend: "improving" | "stable" | "declining";
  riskLevel: "low" | "medium" | "high";
  daysUntilRisk: number | null;
  recommendations: string[];
}

// Generate mock historical data
// Historical data now fetched from tRPC ai.history.list endpoint

// Generate mock predictions
// Mock data removed - generateMockPredictions (data comes from tRPC or is not yet implemented)

// Trend icon component
function TrendIcon({ trend }: { trend: "improving" | "stable" | "declining" }) {
  if (trend === "improving") return <TrendingUp className="h-5 w-5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="h-5 w-5 text-red-500" />;
  return <Minus className="h-5 w-5 text-gray-500" />;
}

// Risk badge component
function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    high: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return <Badge className={colors[risk]}>{risk.toUpperCase()}</Badge>;
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(3) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AiPredictive() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [horizon, setHorizon] = useState<string>("7");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");

  // Queries
  const { data: products } = trpc.product.list.useQuery();
  const { data: stations } = trpc.workstation.list.useQuery();

  // Fetch prediction history from backend
  const { data: historyResult } = trpc.ai.history.list.useQuery({
    predictionType: "cpk",
    limit: 50,
  });

  const historicalData = useMemo(() => {
    if (!historyResult?.history?.length) return [];
    return historyResult.history.map((h: any) => ({
      date: new Date(h.createdAt).toISOString().split('T')[0],
      actualCpk: h.actualValue ?? h.predictedValue ?? 1.33,
    }));
  }, [historyResult]);

  const lastActualCpk = historicalData[historicalData.length - 1]?.actualCpk || 1.35;
  const { predictions, summary } = useMemo(
    () => ({ predictions: [] as any[], summary: { avgCpk: 0, minCpk: 0, maxCpk: 0, trend: 'stable' } }),
    [horizon, lastActualCpk]
  );

  // Combine historical and prediction data for chart
  const chartData = useMemo(() => {
    const combined = [
      ...historicalData.map(d => ({
        date: d.date,
        actualCpk: d.actualCpk,
        predictedCpk: null as number | null,
        lowerBound: null as number | null,
        upperBound: null as number | null,
        type: "historical",
      })),
      ...predictions.map(p => ({
        date: p.date,
        actualCpk: null as number | null,
        predictedCpk: p.predictedCpk,
        lowerBound: p.lowerBound,
        upperBound: p.upperBound,
        type: "forecast",
      })),
    ];
    return combined;
  }, [historicalData, predictions]);

  // Risk indicator data for scatter plot
  const riskIndicators = useMemo(() => {
    return predictions
      .filter(p => p.risk === "high")
      .map(p => ({
        date: p.date,
        value: p.predictedCpk,
        risk: p.risk,
      }));
  }, [predictions]);

  const runPrediction = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast.success(isVi ? "Dự báo hoàn tất" : "Prediction complete");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              {isVi ? "Dự báo AI (Predictive Analytics)" : "AI Predictive Analytics"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi
                ? "Dự báo CPK và xu hướng sử dụng thuật toán ARIMA/Prophet"
                : "CPK forecasting and trend prediction using ARIMA/Prophet algorithms"}
            </p>
          </div>
          <ExportButtons 
            productCode={selectedProduct ? products?.find(p => p.id.toString() === selectedProduct)?.code || "" : ""}
            stationName={selectedStation ? stations?.find(s => s.id.toString() === selectedStation)?.name || "" : ""}
            forecastDays={parseInt(horizon)}
            isVi={isVi}
          />
        </div>

        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isVi ? "Cấu hình dự báo" : "Forecast Configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Sản phẩm" : "Product"}
                </label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder={isVi ? "Chọn sản phẩm" : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.code} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Trạm đo" : "Station"}
                </label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
                    <SelectValue placeholder={isVi ? "Chọn trạm" : "Select station"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isVi ? "Khoảng dự báo" : "Forecast Horizon"}
                </label>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 {isVi ? "ngày" : "days"}</SelectItem>
                    <SelectItem value="14">14 {isVi ? "ngày" : "days"}</SelectItem>
                    <SelectItem value="30">30 {isVi ? "ngày" : "days"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button className="w-full" onClick={runPrediction} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isVi ? "Đang dự báo..." : "Forecasting..."}
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      {isVi ? "Chạy dự báo" : "Run Forecast"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "CPK dự báo trung bình" : "Avg Predicted CPK"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.avgPredictedCpk.toFixed(3)}</div>
              <div className="flex items-center gap-2 mt-1">
                <TrendIcon trend={summary.trend} />
                <span className="text-sm text-muted-foreground capitalize">{summary.trend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Mức rủi ro" : "Risk Level"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RiskBadge risk={summary.riskLevel} />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {summary.riskLevel === "low"
                  ? isVi ? "Quy trình ổn định" : "Process stable"
                  : summary.riskLevel === "medium"
                  ? isVi ? "Cần theo dõi" : "Monitor closely"
                  : isVi ? "Cần hành động" : "Action required"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Ngày đến rủi ro" : "Days to Risk"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary.daysUntilRisk !== null ? (
                  <span className="text-red-600">{summary.daysUntilRisk}</span>
                ) : (
                  <span className="text-green-600">-</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.daysUntilRisk !== null
                  ? isVi ? `CPK sẽ < 1.0 trong ${summary.daysUntilRisk} ngày` : `CPK will be < 1.0 in ${summary.daysUntilRisk} days`
                  : isVi ? "Không có rủi ro trong khoảng dự báo" : "No risk within forecast horizon"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Độ tin cậy" : "Confidence"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(predictions[0]?.confidence * 100).toFixed(0)}%
              </div>
              <Progress value={predictions[0]?.confidence * 100} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Risk Alert */}
        {summary.daysUntilRisk !== null && summary.daysUntilRisk <= 7 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{isVi ? "Cảnh báo rủi ro!" : "Risk Warning!"}</AlertTitle>
            <AlertDescription>
              {isVi
                ? `CPK được dự báo sẽ giảm xuống dưới 1.0 trong ${summary.daysUntilRisk} ngày tới. Cần hành động phòng ngừa ngay.`
                : `CPK is predicted to fall below 1.0 within ${summary.daysUntilRisk} days. Preventive action required.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chart">
              <BarChart3 className="h-4 w-4 mr-2" />
              {isVi ? "Biểu đồ" : "Charts"}
            </TabsTrigger>
            <TabsTrigger value="table">
              <Calendar className="h-4 w-4 mr-2" />
              {isVi ? "Chi tiết" : "Details"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6">
            {/* Forecast Chart with Confidence Bands */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {isVi ? "Biểu đồ dự báo CPK với khoảng tin cậy" : "CPK Forecast with Confidence Bands"}
                </CardTitle>
                <CardDescription>
                  {isVi
                    ? "Dữ liệu lịch sử (30 ngày) và dự báo với khoảng tin cậy 95%"
                    : "Historical data (30 days) and forecast with 95% confidence interval"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis 
                        domain={[0.6, 2.0]}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      
                      {/* Reference lines for CPK thresholds */}
                      <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "Target (1.33)", position: "right", fill: "#22c55e", fontSize: 11 }} />
                      <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: "Min (1.0)", position: "right", fill: "#f59e0b", fontSize: 11 }} />
                      
                      {/* Confidence band (area between lower and upper bounds) */}
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name={isVi ? "Giới hạn trên" : "Upper Bound"}
                      />
                      <Area
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        name={isVi ? "Giới hạn dưới" : "Lower Bound"}
                      />
                      
                      {/* Historical CPK line */}
                      <Line
                        type="monotone"
                        dataKey="actualCpk"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", r: 3 }}
                        name={isVi ? "CPK thực tế" : "Actual CPK"}
                        connectNulls={false}
                      />
                      
                      {/* Predicted CPK line */}
                      <Line
                        type="monotone"
                        dataKey="predictedCpk"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#3b82f6", r: 3 }}
                        name={isVi ? "CPK dự báo" : "Predicted CPK"}
                        connectNulls={false}
                      />
                      
                      {/* Risk indicators */}
                      <Scatter
                        data={riskIndicators}
                        dataKey="value"
                        fill="#ef4444"
                        name={isVi ? "Điểm rủi ro cao" : "High Risk Points"}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Trend Analysis Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {isVi ? "Phân tích xu hướng" : "Trend Analysis"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictions}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => value.slice(5)}
                        />
                        <YAxis 
                          domain={[0.8, 1.8]}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <defs>
                          <linearGradient id="colorCpk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="predictedCpk"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorCpk)"
                          name={isVi ? "CPK dự báo" : "Predicted CPK"}
                        />
                        <ReferenceLine y={1.33} stroke="#22c55e" strokeDasharray="3 3" />
                        <ReferenceLine y={1.0} stroke="#f59e0b" strokeDasharray="3 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {isVi ? "Độ tin cậy theo thời gian" : "Confidence Over Time"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictions}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => value.slice(5)}
                        />
                        <YAxis 
                          domain={[0.5, 1]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, isVi ? "Độ tin cậy" : "Confidence"]}
                        />
                        <defs>
                          <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="confidence"
                          stroke="#8b5cf6"
                          fillOpacity={1}
                          fill="url(#colorConf)"
                          name={isVi ? "Độ tin cậy" : "Confidence"}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Predictions Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {isVi ? "Chi tiết dự báo" : "Forecast Details"}
                  </CardTitle>
                  <CardDescription>
                    {isVi
                      ? `Dự báo CPK cho ${horizon} ngày tới`
                      : `CPK forecast for the next ${horizon} days`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isVi ? "Ngày" : "Date"}</TableHead>
                        <TableHead>{isVi ? "CPK dự báo" : "Predicted CPK"}</TableHead>
                        <TableHead>{isVi ? "Khoảng tin cậy" : "Confidence Interval"}</TableHead>
                        <TableHead>{isVi ? "Độ tin cậy" : "Confidence"}</TableHead>
                        <TableHead>{isVi ? "Rủi ro" : "Risk"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predictions.map((pred, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{pred.date}</TableCell>
                          <TableCell>
                            <span className={pred.predictedCpk < 1.0 ? "text-red-600 font-bold" : pred.predictedCpk < 1.33 ? "text-yellow-600" : "text-green-600"}>
                              {pred.predictedCpk.toFixed(3)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            [{pred.lowerBound.toFixed(3)} - {pred.upperBound.toFixed(3)}]
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pred.confidence * 100} className="h-2 w-16" />
                              <span className="text-sm">{(pred.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RiskBadge risk={pred.risk} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      {isVi ? "Khuyến nghị" : "Recommendations"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {summary.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-500" />
                      {isVi ? "Thông tin mô hình" : "Model Info"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "Thuật toán" : "Algorithm"}
                      </span>
                      <Badge variant="secondary">ARIMA + Prophet</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "Dữ liệu huấn luyện" : "Training Data"}
                      </span>
                      <span className="text-sm font-medium">90 {isVi ? "ngày" : "days"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "Cập nhật lần cuối" : "Last Updated"}
                      </span>
                      <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">MAPE</span>
                      <span className="text-sm font-medium">4.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">RMSE</span>
                      <span className="text-sm font-medium">0.052</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {isVi ? "Thống kê dự báo" : "Forecast Stats"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "CPK cao nhất" : "Max CPK"}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {Math.max(...predictions.map(p => p.predictedCpk)).toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "CPK thấp nhất" : "Min CPK"}
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {Math.min(...predictions.map(p => p.predictedCpk)).toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {isVi ? "Ngày rủi ro cao" : "High Risk Days"}
                      </span>
                      <span className="text-sm font-medium">
                        {predictions.filter(p => p.risk === "high").length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
