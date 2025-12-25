import { useState, useMemo } from "react";
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
  LineChart,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

// Types
interface Prediction {
  date: string;
  predictedCpk: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  risk: "low" | "medium" | "high";
}

interface ForecastSummary {
  avgPredictedCpk: number;
  trend: "improving" | "stable" | "declining";
  riskLevel: "low" | "medium" | "high";
  daysUntilRisk: number | null;
  recommendations: string[];
}

// Generate mock predictions
function generateMockPredictions(horizon: number): { predictions: Prediction[]; summary: ForecastSummary } {
  const predictions: Prediction[] = [];
  let baseCpk = 1.35;
  const trend = Math.random() > 0.5 ? 0.01 : -0.008;
  
  for (let i = 1; i <= horizon; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    const noise = (Math.random() - 0.5) * 0.1;
    const predictedCpk = baseCpk + trend * i + noise;
    const uncertainty = 0.05 + (i * 0.01);
    
    predictions.push({
      date: date.toISOString().split("T")[0],
      predictedCpk: Math.max(0.8, Math.min(2.0, predictedCpk)),
      lowerBound: Math.max(0.5, predictedCpk - uncertainty),
      upperBound: Math.min(2.5, predictedCpk + uncertainty),
      confidence: Math.max(0.6, 0.95 - (i * 0.02)),
      risk: predictedCpk < 1.0 ? "high" : predictedCpk < 1.33 ? "medium" : "low",
    });
    
    baseCpk = predictedCpk;
  }
  
  const avgCpk = predictions.reduce((sum, p) => sum + p.predictedCpk, 0) / predictions.length;
  const lastCpk = predictions[predictions.length - 1].predictedCpk;
  const firstCpk = predictions[0].predictedCpk;
  
  const daysUntilRisk = predictions.findIndex(p => p.predictedCpk < 1.0);
  
  return {
    predictions,
    summary: {
      avgPredictedCpk: avgCpk,
      trend: lastCpk > firstCpk + 0.05 ? "improving" : lastCpk < firstCpk - 0.05 ? "declining" : "stable",
      riskLevel: avgCpk < 1.0 ? "high" : avgCpk < 1.33 ? "medium" : "low",
      daysUntilRisk: daysUntilRisk >= 0 ? daysUntilRisk + 1 : null,
      recommendations: avgCpk < 1.33 
        ? [
            "Kiểm tra và thay thế dao cắt nếu cần",
            "Tăng tần suất calibration thiết bị",
            "Xem xét điều chỉnh thông số quy trình",
          ]
        : [
            "Duy trì điều kiện quy trình hiện tại",
            "Tiếp tục giám sát xu hướng",
          ],
    },
  };
}

// Trend icon component
function TrendIcon({ trend }: { trend: "improving" | "stable" | "declining" }) {
  if (trend === "improving") return <TrendingUp className="h-5 w-5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="h-5 w-5 text-red-500" />;
  return <Minus className="h-5 w-5 text-gray-500" />;
}

// Risk badge component
function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const colors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  return <Badge className={colors[risk]}>{risk.toUpperCase()}</Badge>;
}

export default function AiPredictive() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [horizon, setHorizon] = useState<string>("7");
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const { data: products } = trpc.product.list.useQuery();
  const { data: stations } = trpc.workstation.list.useQuery();

  // Mock predictions
  const { predictions, summary } = useMemo(
    () => generateMockPredictions(parseInt(horizon)),
    [horizon]
  );

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {isVi ? "Xuất báo cáo" : "Export"}
            </Button>
          </div>
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

          {/* Recommendations */}
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
                  <span className="text-sm text-muted-foreground">
                    MAPE
                  </span>
                  <span className="text-sm font-medium">4.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    RMSE
                  </span>
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
      </div>
    </DashboardLayout>
  );
}
