import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity,
  BarChart3,
  RefreshCw,
  Calendar,
  Percent,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceLine
} from 'recharts';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ForecastAccuracyDashboard() {
  const [timeRange, setTimeRange] = useState('30d');
  const [metricType, setMetricType] = useState('cpk');
  const [selectedLine, setSelectedLine] = useState('all');

  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Fetch forecast history
  const { data: forecastHistory, isLoading: loadingHistory, refetch } = trpc.predictiveAlert.getForecastHistory.useQuery({
    days: parseInt(timeRange.replace('d', '')),
    metricType: metricType as 'cpk' | 'oee' | 'defect_rate',
    productionLineId: selectedLine !== 'all' ? parseInt(selectedLine) : undefined
  });

  // Calculate accuracy metrics
  const accuracyMetrics = useMemo(() => {
    if (!forecastHistory || forecastHistory.length === 0) {
      return {
        mape: 0,
        rmse: 0,
        mae: 0,
        accuracy: 0,
        totalPredictions: 0,
        withinThreshold: 0
      };
    }

    const validData = forecastHistory.filter((d: any) => 
      d.predictedValue !== null && d.actualValue !== null
    );

    if (validData.length === 0) {
      return {
        mape: 0,
        rmse: 0,
        mae: 0,
        accuracy: 0,
        totalPredictions: 0,
        withinThreshold: 0
      };
    }

    // Calculate MAPE (Mean Absolute Percentage Error)
    const mape = validData.reduce((sum: number, d: any) => {
      if (d.actualValue === 0) return sum;
      return sum + Math.abs((d.actualValue - d.predictedValue) / d.actualValue);
    }, 0) / validData.length * 100;

    // Calculate RMSE (Root Mean Square Error)
    const rmse = Math.sqrt(
      validData.reduce((sum: number, d: any) => 
        sum + Math.pow(d.actualValue - d.predictedValue, 2), 0
      ) / validData.length
    );

    // Calculate MAE (Mean Absolute Error)
    const mae = validData.reduce((sum: number, d: any) => 
      sum + Math.abs(d.actualValue - d.predictedValue), 0
    ) / validData.length;

    // Calculate predictions within 10% threshold
    const withinThreshold = validData.filter((d: any) => {
      if (d.actualValue === 0) return false;
      return Math.abs((d.actualValue - d.predictedValue) / d.actualValue) <= 0.1;
    }).length;

    return {
      mape,
      rmse,
      mae,
      accuracy: 100 - mape,
      totalPredictions: validData.length,
      withinThreshold
    };
  }, [forecastHistory]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!forecastHistory) return [];

    return forecastHistory.map((d: any) => ({
      date: new Date(d.forecastDate).toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      predicted: d.predictedValue,
      actual: d.actualValue,
      error: d.actualValue !== null ? Math.abs(d.actualValue - d.predictedValue) : null,
      errorPercent: d.actualValue !== null && d.actualValue !== 0 
        ? Math.abs((d.actualValue - d.predictedValue) / d.actualValue) * 100 
        : null,
      upperBound: d.upperBound,
      lowerBound: d.lowerBound
    }));
  }, [forecastHistory]);

  // Error distribution data
  const errorDistribution = useMemo(() => {
    if (!forecastHistory) return [];

    const ranges = [
      { range: '0-5%', min: 0, max: 5, count: 0 },
      { range: '5-10%', min: 5, max: 10, count: 0 },
      { range: '10-15%', min: 10, max: 15, count: 0 },
      { range: '15-20%', min: 15, max: 20, count: 0 },
      { range: '>20%', min: 20, max: Infinity, count: 0 }
    ];

    forecastHistory.forEach((d: any) => {
      if (d.actualValue === null || d.actualValue === 0) return;
      const errorPercent = Math.abs((d.actualValue - d.predictedValue) / d.actualValue) * 100;
      
      for (const range of ranges) {
        if (errorPercent >= range.min && errorPercent < range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges;
  }, [forecastHistory]);

  // Scatter plot data for predicted vs actual
  const scatterData = useMemo(() => {
    if (!forecastHistory) return [];

    return forecastHistory
      .filter((d: any) => d.actualValue !== null)
      .map((d: any) => ({
        predicted: d.predictedValue,
        actual: d.actualValue,
        date: new Date(d.forecastDate).toLocaleDateString('vi-VN')
      }));
  }, [forecastHistory]);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 90) return <Badge className="bg-green-500">Xuất sắc</Badge>;
    if (accuracy >= 80) return <Badge className="bg-yellow-500">Tốt</Badge>;
    if (accuracy >= 70) return <Badge className="bg-orange-500">Trung bình</Badge>;
    return <Badge variant="destructive">Cần cải thiện</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Đánh giá Độ chính xác Dự báo</h1>
            <p className="text-muted-foreground">
              So sánh giữa giá trị dự báo và thực tế để đánh giá hiệu quả model AI
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={metricType} onValueChange={setMetricType}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpk">CPK</SelectItem>
                <SelectItem value="oee">OEE</SelectItem>
                <SelectItem value="defect_rate">Tỷ lệ lỗi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {productionLines?.map((line: any) => (
                  <SelectItem key={line.id} value={line.id.toString()}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Accuracy Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Độ chính xác</p>
                  <p className={`text-2xl font-bold ${getAccuracyColor(accuracyMetrics.accuracy)}`}>
                    {accuracyMetrics.accuracy.toFixed(1)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-2">
                {getAccuracyBadge(accuracyMetrics.accuracy)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MAPE</p>
                  <p className="text-2xl font-bold">{accuracyMetrics.mape.toFixed(2)}%</p>
                </div>
                <Percent className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mean Absolute % Error
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RMSE</p>
                  <p className="text-2xl font-bold">{accuracyMetrics.rmse.toFixed(3)}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Root Mean Square Error
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MAE</p>
                  <p className="text-2xl font-bold">{accuracyMetrics.mae.toFixed(3)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mean Absolute Error
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng dự báo</p>
                  <p className="text-2xl font-bold">{accuracyMetrics.totalPredictions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Trong ngưỡng 10%</p>
                  <p className="text-2xl font-bold text-green-600">
                    {accuracyMetrics.withinThreshold}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-green-600 mt-2">
                {accuracyMetrics.totalPredictions > 0 
                  ? `${((accuracyMetrics.withinThreshold / accuracyMetrics.totalPredictions) * 100).toFixed(1)}% dự báo`
                  : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="comparison">So sánh</TabsTrigger>
            <TabsTrigger value="scatter">Phân tán</TabsTrigger>
            <TabsTrigger value="error">Phân bổ sai số</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng Dự báo vs Thực tế</CardTitle>
                <CardDescription>
                  So sánh giá trị dự báo với giá trị thực tế theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Info className="h-12 w-12 mb-2" />
                    <p>Chưa có dữ liệu dự báo</p>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stackId="1"
                          stroke="none"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          name="Giới hạn trên"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stackId="2"
                          stroke="none"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          name="Giới hạn dưới"
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Dự báo"
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Thực tế"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>So sánh Chi tiết</CardTitle>
                <CardDescription>
                  Biểu đồ cột so sánh giá trị dự báo và thực tế với sai số
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="predicted" 
                          fill="#3b82f6" 
                          name="Dự báo"
                          barSize={20}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="actual" 
                          fill="#22c55e" 
                          name="Thực tế"
                          barSize={20}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="errorPercent"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Sai số %"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scatter">
            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ Phân tán Dự báo vs Thực tế</CardTitle>
                <CardDescription>
                  Điểm càng gần đường chéo, độ chính xác càng cao
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="predicted" 
                          name="Dự báo"
                          label={{ value: 'Giá trị Dự báo', position: 'bottom', offset: -5 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="actual" 
                          name="Thực tế"
                          label={{ value: 'Giá trị Thực tế', angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis range={[60, 60]} />
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border rounded-lg shadow-lg p-3">
                                  <p className="font-medium">{data.date}</p>
                                  <p className="text-sm text-blue-600">Dự báo: {data.predicted?.toFixed(3)}</p>
                                  <p className="text-sm text-green-600">Thực tế: {data.actual?.toFixed(3)}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine 
                          segment={[{ x: 0, y: 0 }, { x: 2, y: 2 }]} 
                          stroke="#888" 
                          strokeDasharray="5 5"
                          label="Đường lý tưởng"
                        />
                        <Scatter 
                          name="Dự báo vs Thực tế" 
                          data={scatterData} 
                          fill="#3b82f6"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="error">
            <Card>
              <CardHeader>
                <CardTitle>Phân bổ Sai số Dự báo</CardTitle>
                <CardDescription>
                  Phân bổ sai số theo các khoảng phần trăm
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={errorDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="count" 
                          fill="#3b82f6" 
                          name="Số lượng dự báo"
                          radius={[4, 4, 0, 0]}
                        >
                          {errorDistribution.map((entry, index) => (
                            <Bar 
                              key={`cell-${index}`}
                              fill={index < 2 ? '#22c55e' : index < 3 ? '#eab308' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Model Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Tóm tắt Hiệu suất Model</CardTitle>
            <CardDescription>
              Đánh giá tổng quan về độ chính xác của model dự báo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Điểm mạnh
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {accuracyMetrics.accuracy >= 85 && (
                    <li>• Độ chính xác tổng thể cao ({accuracyMetrics.accuracy.toFixed(1)}%)</li>
                  )}
                  {accuracyMetrics.mape < 10 && (
                    <li>• MAPE thấp, dự báo ổn định</li>
                  )}
                  {accuracyMetrics.withinThreshold / accuracyMetrics.totalPredictions > 0.7 && (
                    <li>• Hơn 70% dự báo trong ngưỡng 10%</li>
                  )}
                  {accuracyMetrics.accuracy < 85 && accuracyMetrics.mape >= 10 && (
                    <li>• Model đang học và cải thiện</li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Cần cải thiện
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {accuracyMetrics.accuracy < 85 && (
                    <li>• Cần thêm dữ liệu huấn luyện</li>
                  )}
                  {accuracyMetrics.mape >= 15 && (
                    <li>• MAPE cao, cần điều chỉnh tham số</li>
                  )}
                  {accuracyMetrics.rmse > 0.5 && (
                    <li>• RMSE cao, có outliers cần xử lý</li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  Khuyến nghị
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Theo dõi xu hướng sai số theo thời gian</li>
                  <li>• Cập nhật model định kỳ với dữ liệu mới</li>
                  <li>• Xem xét các yếu tố ngoại sinh ảnh hưởng</li>
                  <li>• So sánh với các model khác để tối ưu</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
