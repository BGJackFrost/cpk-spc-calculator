/**
 * CPK Forecast Component
 * Dự báo xu hướng CPK với Linear Regression, Moving Average, Exponential Smoothing
 * Task: SPC-05
 */

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Settings,
  RefreshCw,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface CpkDataPoint {
  date: Date;
  cpk: number;
  cp?: number;
  ppk?: number;
  pp?: number;
}

interface ForecastResult {
  date: Date;
  actual?: number;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  isForecast: boolean;
}

interface CpkForecastProps {
  data: CpkDataPoint[];
  warningThreshold?: number;
  criticalThreshold?: number;
  forecastPeriods?: number;
  onAlert?: (alert: { type: string; message: string; forecastDate: Date; forecastValue: number }) => void;
}

type ForecastMethod = "linear" | "ma" | "es" | "weighted";

// Linear Regression
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * data[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = data.reduce((acc, yi) => acc + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = data.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssResidual = data.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * i + intercept), 2), 0);
  const r2 = 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

// Moving Average
function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

// Exponential Smoothing
function exponentialSmoothing(data: number[], alpha: number): number[] {
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Weighted Moving Average
function weightedMovingAverage(data: number[], weights: number[]): number[] {
  const result: number[] = [];
  const window = weights.length;
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      let sum = 0;
      for (let j = 0; j < window; j++) {
        sum += data[i - window + 1 + j] * weights[j];
      }
      result.push(sum / weightSum);
    }
  }
  return result;
}

// Calculate forecast with confidence intervals
function calculateForecast(
  data: CpkDataPoint[],
  method: ForecastMethod,
  periods: number,
  params: { maWindow?: number; esAlpha?: number }
): ForecastResult[] {
  const cpkValues = data.map((d) => d.cpk);
  const n = cpkValues.length;
  const results: ForecastResult[] = [];

  // Historical data
  data.forEach((d, i) => {
    results.push({
      date: d.date,
      actual: d.cpk,
      forecast: d.cpk,
      lowerBound: d.cpk,
      upperBound: d.cpk,
      isForecast: false,
    });
  });

  // Calculate standard error for confidence intervals
  const mean = cpkValues.reduce((a, b) => a + b, 0) / n;
  const stdDev = Math.sqrt(cpkValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
  const confidenceMultiplier = 1.96; // 95% confidence

  // Forecast based on method
  if (method === "linear") {
    const { slope, intercept } = linearRegression(cpkValues);
    for (let i = 1; i <= periods; i++) {
      const forecastValue = slope * (n + i - 1) + intercept;
      const forecastDate = new Date(data[n - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Prediction interval widens with distance
      const se = stdDev * Math.sqrt(1 + 1 / n + Math.pow(n + i - 1 - (n - 1) / 2, 2) / (n * (n - 1) / 12));
      
      results.push({
        date: forecastDate,
        forecast: forecastValue,
        lowerBound: forecastValue - confidenceMultiplier * se,
        upperBound: forecastValue + confidenceMultiplier * se,
        isForecast: true,
      });
    }
  } else if (method === "ma") {
    const window = params.maWindow || 5;
    const maValues = movingAverage(cpkValues, window);
    const lastMA = maValues[maValues.length - 1];
    
    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(data[n - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      results.push({
        date: forecastDate,
        forecast: lastMA,
        lowerBound: lastMA - confidenceMultiplier * stdDev,
        upperBound: lastMA + confidenceMultiplier * stdDev,
        isForecast: true,
      });
    }
  } else if (method === "es") {
    const alpha = params.esAlpha || 0.3;
    const esValues = exponentialSmoothing(cpkValues, alpha);
    const lastES = esValues[esValues.length - 1];
    
    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(data[n - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // ES forecast error increases with horizon
      const se = stdDev * Math.sqrt(1 + (i - 1) * alpha * alpha);
      
      results.push({
        date: forecastDate,
        forecast: lastES,
        lowerBound: lastES - confidenceMultiplier * se,
        upperBound: lastES + confidenceMultiplier * se,
        isForecast: true,
      });
    }
  } else if (method === "weighted") {
    const weights = [1, 2, 3, 4, 5]; // More recent data has higher weight
    const wmaValues = weightedMovingAverage(cpkValues, weights);
    const lastWMA = wmaValues[wmaValues.length - 1];
    
    // Trend from recent weighted values
    const recentTrend = (wmaValues[wmaValues.length - 1] - wmaValues[wmaValues.length - 3]) / 2;
    
    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(data[n - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      const forecastValue = lastWMA + recentTrend * i;
      
      results.push({
        date: forecastDate,
        forecast: forecastValue,
        lowerBound: forecastValue - confidenceMultiplier * stdDev * Math.sqrt(i),
        upperBound: forecastValue + confidenceMultiplier * stdDev * Math.sqrt(i),
        isForecast: true,
      });
    }
  }

  return results;
}

export default function CpkForecast({
  data,
  warningThreshold = 1.33,
  criticalThreshold = 1.0,
  forecastPeriods = 7,
  onAlert,
}: CpkForecastProps) {
  const [method, setMethod] = useState<ForecastMethod>("linear");
  const [periods, setPeriods] = useState(forecastPeriods);
  const [maWindow, setMaWindow] = useState(5);
  const [esAlpha, setEsAlpha] = useState(0.3);

  // Calculate forecast
  const forecastData = useMemo(() => {
    if (data.length < 3) return [];
    return calculateForecast(data, method, periods, { maWindow, esAlpha });
  }, [data, method, periods, maWindow, esAlpha]);

  // Calculate regression stats
  const regressionStats = useMemo(() => {
    if (data.length < 3) return null;
    const cpkValues = data.map((d) => d.cpk);
    return linearRegression(cpkValues);
  }, [data]);

  // Detect alerts
  const alerts = useMemo(() => {
    const alerts: { type: "warning" | "critical"; message: string; date: Date; value: number }[] = [];
    
    forecastData
      .filter((d) => d.isForecast)
      .forEach((d) => {
        if (d.forecast < criticalThreshold) {
          alerts.push({
            type: "critical",
            message: `CPK dự báo giảm xuống ${d.forecast.toFixed(3)} (dưới ngưỡng ${criticalThreshold})`,
            date: d.date,
            value: d.forecast,
          });
        } else if (d.forecast < warningThreshold) {
          alerts.push({
            type: "warning",
            message: `CPK dự báo giảm xuống ${d.forecast.toFixed(3)} (dưới ngưỡng ${warningThreshold})`,
            date: d.date,
            value: d.forecast,
          });
        }
      });

    return alerts;
  }, [forecastData, warningThreshold, criticalThreshold]);

  // Trigger alerts
  useMemo(() => {
    if (alerts.length > 0 && onAlert) {
      alerts.forEach((alert) => {
        onAlert({
          type: alert.type,
          message: alert.message,
          forecastDate: alert.date,
          forecastValue: alert.value,
        });
      });
    }
  }, [alerts, onAlert]);

  // Trend indicator
  const trend = useMemo(() => {
    if (!regressionStats) return null;
    const { slope, r2 } = regressionStats;
    if (Math.abs(slope) < 0.001) return { direction: "stable", strength: "weak" };
    if (slope > 0) {
      return { direction: "up", strength: r2 > 0.7 ? "strong" : r2 > 0.4 ? "moderate" : "weak" };
    }
    return { direction: "down", strength: r2 > 0.7 ? "strong" : r2 > 0.4 ? "moderate" : "weak" };
  }, [regressionStats]);

  // Chart data
  const chartData = useMemo(() => {
    return forecastData.map((d) => ({
      ...d,
      date: format(d.date, "dd/MM", { locale: vi }),
      fullDate: d.date,
    }));
  }, [forecastData]);

  const methodLabels: Record<ForecastMethod, string> = {
    linear: "Hồi quy tuyến tính",
    ma: "Trung bình động",
    es: "Làm mượt mũ",
    weighted: "Trung bình có trọng số",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Dự báo xu hướng CPK
            </CardTitle>
            <CardDescription>
              Dự báo CPK trong {periods} kỳ tiếp theo sử dụng {methodLabels[method]}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Trend indicator */}
            {trend && (
              <Badge
                variant={trend.direction === "up" ? "default" : trend.direction === "down" ? "destructive" : "secondary"}
                className="flex items-center gap-1"
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend.direction === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {trend.direction === "up" ? "Tăng" : trend.direction === "down" ? "Giảm" : "Ổn định"}
                ({trend.strength === "strong" ? "mạnh" : trend.strength === "moderate" ? "vừa" : "yếu"})
              </Badge>
            )}

            {/* Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">Cài đặt dự báo</h4>
                  
                  <div className="space-y-2">
                    <Label>Phương pháp</Label>
                    <Select value={method} onValueChange={(v: ForecastMethod) => setMethod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Hồi quy tuyến tính</SelectItem>
                        <SelectItem value="ma">Trung bình động (MA)</SelectItem>
                        <SelectItem value="es">Làm mượt mũ (ES)</SelectItem>
                        <SelectItem value="weighted">Trung bình có trọng số (WMA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Số kỳ dự báo: {periods}</Label>
                    <Slider
                      value={[periods]}
                      onValueChange={(v) => setPeriods(v[0])}
                      min={1}
                      max={30}
                      step={1}
                    />
                  </div>

                  {method === "ma" && (
                    <div className="space-y-2">
                      <Label>Cửa sổ MA: {maWindow}</Label>
                      <Slider
                        value={[maWindow]}
                        onValueChange={(v) => setMaWindow(v[0])}
                        min={2}
                        max={10}
                        step={1}
                      />
                    </div>
                  )}

                  {method === "es" && (
                    <div className="space-y-2">
                      <Label>Hệ số alpha: {esAlpha.toFixed(2)}</Label>
                      <Slider
                        value={[esAlpha * 100]}
                        onValueChange={(v) => setEsAlpha(v[0] / 100)}
                        min={10}
                        max={90}
                        step={5}
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 3).map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                  alert.type === "critical"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{alert.message}</span>
                <span className="text-xs opacity-70">
                  ({format(alert.date, "dd/MM/yyyy", { locale: vi })})
                </span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
            <TabsTrigger value="table">Bảng dữ liệu</TabsTrigger>
            <TabsTrigger value="stats">Thống kê</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3">
                        <div className="font-medium mb-1">
                          {format(data.fullDate, "dd/MM/yyyy", { locale: vi })}
                        </div>
                        {data.actual !== undefined && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Thực tế: </span>
                            <span className="font-medium">{data.actual.toFixed(4)}</span>
                          </div>
                        )}
                        {data.isForecast && (
                          <>
                            <div className="text-sm text-blue-500">
                              <span>Dự báo: </span>
                              <span className="font-medium">{data.forecast.toFixed(4)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              CI: [{data.lowerBound.toFixed(4)} - {data.upperBound.toFixed(4)}]
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />

                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Khoảng tin cậy"
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                />

                {/* Threshold lines */}
                <ReferenceLine
                  y={warningThreshold}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{ value: `Cảnh báo: ${warningThreshold}`, position: "right", fontSize: 10 }}
                />
                <ReferenceLine
                  y={criticalThreshold}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: `Nguy hiểm: ${criticalThreshold}`, position: "right", fontSize: 10 }}
                />

                {/* Actual data line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  name="CPK thực tế"
                  connectNulls
                />

                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.isForecast) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }}
                  name="CPK dự báo"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="table">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Ngày</th>
                    <th className="px-4 py-2 text-right">CPK thực tế</th>
                    <th className="px-4 py-2 text-right">Dự báo</th>
                    <th className="px-4 py-2 text-right">Khoảng tin cậy</th>
                    <th className="px-4 py-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-t ${row.isForecast ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    >
                      <td className="px-4 py-2">
                        {format(row.date, "dd/MM/yyyy", { locale: vi })}
                        {row.isForecast && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Dự báo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {row.actual?.toFixed(4) || "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-blue-600">
                        {row.isForecast ? row.forecast.toFixed(4) : "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                        {row.isForecast
                          ? `[${row.lowerBound.toFixed(3)} - ${row.upperBound.toFixed(3)}]`
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {(row.actual || row.forecast) < criticalThreshold ? (
                          <Badge variant="destructive">Nguy hiểm</Badge>
                        ) : (row.actual || row.forecast) < warningThreshold ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            Cảnh báo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            Tốt
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {regressionStats && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Hệ số góc (Slope)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {regressionStats.slope > 0 ? "+" : ""}
                        {regressionStats.slope.toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {regressionStats.slope > 0
                          ? "Xu hướng tăng"
                          : regressionStats.slope < 0
                          ? "Xu hướng giảm"
                          : "Ổn định"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>R² (Độ phù hợp)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(regressionStats.r2 * 100).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {regressionStats.r2 > 0.7
                          ? "Độ tin cậy cao"
                          : regressionStats.r2 > 0.4
                          ? "Độ tin cậy trung bình"
                          : "Độ tin cậy thấp"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>CPK hiện tại</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data[data.length - 1]?.cpk.toFixed(3)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Giá trị mới nhất
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>CPK dự báo ({periods} kỳ)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {forecastData[forecastData.length - 1]?.forecast.toFixed(3)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(forecastData[forecastData.length - 1]?.date || new Date(), "dd/MM/yyyy", { locale: vi })}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Method explanation */}
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Về phương pháp {methodLabels[method]}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {method === "linear" && (
                  <p>
                    Hồi quy tuyến tính tìm đường thẳng phù hợp nhất với dữ liệu lịch sử và ngoại suy xu hướng.
                    Phù hợp khi dữ liệu có xu hướng tuyến tính rõ ràng. R² cho biết mức độ phù hợp của mô hình.
                  </p>
                )}
                {method === "ma" && (
                  <p>
                    Trung bình động tính giá trị trung bình của {maWindow} kỳ gần nhất để làm mượt biến động ngắn hạn.
                    Phù hợp khi dữ liệu dao động quanh một mức ổn định.
                  </p>
                )}
                {method === "es" && (
                  <p>
                    Làm mượt mũ với alpha = {esAlpha.toFixed(2)} cho trọng số cao hơn với dữ liệu gần đây.
                    Alpha cao phản ứng nhanh với thay đổi, alpha thấp cho dự báo ổn định hơn.
                  </p>
                )}
                {method === "weighted" && (
                  <p>
                    Trung bình có trọng số kết hợp dữ liệu gần đây (trọng số cao) với xu hướng ngắn hạn.
                    Phù hợp khi muốn cân bằng giữa ổn định và phản ứng với thay đổi.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
