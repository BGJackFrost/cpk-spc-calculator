/**
 * AdvancedAnalyticsDashboard - Dashboard phân tích nâng cao
 * Phase 3.2 - Advanced Analytics
 */

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Activity,
  BarChart3, LineChartIcon, Target, Zap, RefreshCw, Download
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Types
interface ForecastPoint {
  timestamp: string;
  actual?: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

interface AnomalyPoint {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
  severity: string;
  type: string;
}

interface CorrelationData {
  x: number;
  y: number;
  label?: string;
}

// Mock data generators
const generateTimeSeriesData = (days: number, baseValue: number, variance: number) => {
  const data: { timestamp: string; value: number }[] = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add trend and noise
    const trend = (days - i) * 0.1;
    const seasonal = Math.sin((days - i) * Math.PI / 7) * variance * 0.3;
    const noise = (Math.random() - 0.5) * variance;
    
    data.push({
      timestamp: date.toISOString().split('T')[0],
      value: baseValue + trend + seasonal + noise
    });
  }
  
  return data;
};

const generateForecastData = (historicalData: { timestamp: string; value: number }[], horizon: number): ForecastPoint[] => {
  const values = historicalData.map(d => d.value);
  const n = values.length;
  
  // Simple linear regression
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Standard error
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (values[i] - (intercept + slope * i)) ** 2;
  }
  const se = Math.sqrt(ssRes / (n - 2));
  
  // Generate forecast
  const result: ForecastPoint[] = [];
  const lastDate = new Date(historicalData[n - 1].timestamp);
  
  // Add historical data
  for (let i = 0; i < n; i++) {
    result.push({
      timestamp: historicalData[i].timestamp,
      actual: values[i],
      predicted: intercept + slope * i,
      lowerBound: intercept + slope * i - 1.96 * se,
      upperBound: intercept + slope * i + 1.96 * se
    });
  }
  
  // Add forecast
  for (let i = 1; i <= horizon; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const x = n - 1 + i;
    const predicted = intercept + slope * x;
    const margin = 1.96 * se * Math.sqrt(1 + 1/n + (x - xMean)**2 / denominator);
    
    result.push({
      timestamp: date.toISOString().split('T')[0],
      predicted,
      lowerBound: predicted - margin,
      upperBound: predicted + margin
    });
  }
  
  return result;
};

const generateAnomalyData = (data: { timestamp: string; value: number }[], sensitivity: number): AnomalyPoint[] => {
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  
  return data.map((d, i) => {
    const zScore = Math.abs(d.value - mean) / stdDev;
    const isAnomaly = zScore > sensitivity;
    
    let severity = 'normal';
    let type = 'normal';
    
    if (isAnomaly) {
      if (zScore > sensitivity * 2) severity = 'critical';
      else if (zScore > sensitivity * 1.5) severity = 'high';
      else severity = 'medium';
      
      type = d.value > mean ? 'spike' : 'dip';
    }
    
    return {
      timestamp: d.timestamp,
      value: d.value,
      isAnomaly,
      severity,
      type
    };
  });
};

const generateCorrelationData = (n: number, correlation: number): CorrelationData[] => {
  const data: CorrelationData[] = [];
  
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 100;
    const noise = (Math.random() - 0.5) * (1 - Math.abs(correlation)) * 50;
    const y = correlation * x + (1 - Math.abs(correlation)) * 50 + noise;
    
    data.push({ x, y });
  }
  
  return data;
};

// Heatmap component
const HeatmapCell = ({ value, maxValue }: { value: number; maxValue: number }) => {
  const intensity = value / maxValue;
  const hue = (1 - intensity) * 120; // Green to Red
  
  return (
    <div
      className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium"
      style={{
        backgroundColor: `hsl(${hue}, 70%, ${50 + intensity * 20}%)`,
        color: intensity > 0.5 ? 'white' : 'black'
      }}
    >
      {value.toFixed(1)}
    </div>
  );
};

export default function AdvancedAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30');
  const [forecastHorizon, setForecastHorizon] = useState(7);
  const [anomalySensitivity, setAnomalySensitivity] = useState(2);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('cpk');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate data
  const historicalData = useMemo(() => 
    generateTimeSeriesData(parseInt(timeRange), selectedMetric === 'cpk' ? 1.33 : 85, 0.3),
    [timeRange, selectedMetric]
  );

  const forecastData = useMemo(() => 
    generateForecastData(historicalData, forecastHorizon),
    [historicalData, forecastHorizon]
  );

  const anomalyData = useMemo(() => 
    generateAnomalyData(historicalData, anomalySensitivity),
    [historicalData, anomalySensitivity]
  );

  const correlationData = useMemo(() => 
    generateCorrelationData(50, 0.75),
    []
  );

  // Calculate trend
  const trend = useMemo(() => {
    const values = historicalData.map(d => d.value);
    const n = values.length;
    if (n < 2) return { direction: 'stable', change: 0 };
    
    const firstHalf = values.slice(0, Math.floor(n / 2));
    const secondHalf = values.slice(Math.floor(n / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
      change: Math.abs(change)
    };
  }, [historicalData]);

  // Anomaly count
  const anomalyCount = anomalyData.filter(d => d.isAnomaly).length;

  // Heatmap data (hour x day)
  const heatmapData = useMemo(() => {
    const data: number[][] = [];
    for (let day = 0; day < 7; day++) {
      const row: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        row.push(Math.random() * 100);
      }
      data.push(row);
    }
    return data;
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const TrendIcon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend.direction === 'up' ? 'text-green-500' : trend.direction === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Phân tích Nâng cao</h1>
            <p className="text-muted-foreground">Dự đoán xu hướng, phát hiện bất thường và phân tích tương quan</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chọn chỉ số" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpk">CPK</SelectItem>
                <SelectItem value="oee">OEE</SelectItem>
                <SelectItem value="yield">Yield</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Xu hướng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-8 w-8 ${trendColor}`} />
                <div>
                  <div className="text-2xl font-bold">{trend.change.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {trend.direction === 'up' ? 'Tăng' : trend.direction === 'down' ? 'Giảm' : 'Ổn định'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bất thường</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-8 w-8 ${anomalyCount > 3 ? 'text-red-500' : anomalyCount > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
                <div>
                  <div className="text-2xl font-bold">{anomalyCount}</div>
                  <div className="text-xs text-muted-foreground">điểm bất thường</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Dự báo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {forecastData[forecastData.length - 1]?.predicted.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">dự báo {forecastHorizon} ngày</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Độ tin cậy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Zap className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">95%</div>
                  <div className="text-xs text-muted-foreground">khoảng tin cậy</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Dự báo xu hướng
            </TabsTrigger>
            <TabsTrigger value="anomaly">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Phát hiện bất thường
            </TabsTrigger>
            <TabsTrigger value="correlation">
              <Activity className="h-4 w-4 mr-2" />
              Phân tích tương quan
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <BarChart3 className="h-4 w-4 mr-2" />
              Heatmap
            </TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dự báo {selectedMetric.toUpperCase()}</CardTitle>
                    <CardDescription>
                      Dự báo {forecastHorizon} ngày tiếp theo với khoảng tin cậy 95%
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="horizon">Horizon:</Label>
                      <Slider
                        id="horizon"
                        value={[forecastHorizon]}
                        onValueChange={([v]) => setForecastHorizon(v)}
                        min={1}
                        max={30}
                        step={1}
                        className="w-32"
                      />
                      <span className="text-sm w-8">{forecastHorizon}d</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="ci"
                        checked={showConfidenceInterval}
                        onCheckedChange={setShowConfidenceInterval}
                      />
                      <Label htmlFor="ci">Khoảng tin cậy</Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    {showConfidenceInterval && (
                      <Area
                        type="monotone"
                        dataKey="upperBound"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="Giới hạn trên"
                      />
                    )}
                    {showConfidenceInterval && (
                      <Area
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="none"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        name="Giới hạn dưới"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Thực tế"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name="Dự báo"
                    />
                    <ReferenceLine y={selectedMetric === 'cpk' ? 1.33 : 85} stroke="#ef4444" strokeDasharray="3 3" label="Target" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomaly Tab */}
          <TabsContent value="anomaly" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Phát hiện Bất thường</CardTitle>
                    <CardDescription>
                      Phát hiện các điểm dữ liệu bất thường dựa trên Z-score
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Label>Độ nhạy:</Label>
                    <Slider
                      value={[anomalySensitivity]}
                      onValueChange={([v]) => setAnomalySensitivity(v)}
                      min={1}
                      max={4}
                      step={0.1}
                      className="w-32"
                    />
                    <span className="text-sm w-8">{anomalySensitivity.toFixed(1)}σ</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip
                      content={({ payload }) => {
                        if (!payload?.[0]) return null;
                        const data = payload[0].payload as AnomalyPoint;
                        return (
                          <div className="bg-background border rounded p-2 shadow-lg">
                            <p className="font-medium">{data.timestamp}</p>
                            <p>Giá trị: {data.value.toFixed(2)}</p>
                            {data.isAnomaly && (
                              <>
                                <p className="text-red-500">Bất thường: {data.type}</p>
                                <p>Mức độ: {data.severity}</p>
                              </>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={anomalyData.filter(d => !d.isAnomaly)}
                      fill="#10b981"
                      name="Bình thường"
                    />
                    <Scatter
                      data={anomalyData.filter(d => d.isAnomaly && d.severity === 'medium')}
                      fill="#f59e0b"
                      name="Bất thường (Trung bình)"
                    />
                    <Scatter
                      data={anomalyData.filter(d => d.isAnomaly && d.severity === 'high')}
                      fill="#f97316"
                      name="Bất thường (Cao)"
                    />
                    <Scatter
                      data={anomalyData.filter(d => d.isAnomaly && d.severity === 'critical')}
                      fill="#ef4444"
                      name="Bất thường (Nghiêm trọng)"
                    />
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Anomaly List */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Danh sách điểm bất thường ({anomalyCount})</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {anomalyData.filter(d => d.isAnomaly).map((d, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded">
                        <Badge variant={d.severity === 'critical' ? 'destructive' : d.severity === 'high' ? 'default' : 'secondary'}>
                          {d.type}
                        </Badge>
                        <span className="text-sm">{d.timestamp}</span>
                        <span className="text-sm font-medium">{d.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Correlation Tab */}
          <TabsContent value="correlation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích Tương quan</CardTitle>
                <CardDescription>
                  Phân tích mối quan hệ giữa các biến
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <ResponsiveContainer width="100%" height={350}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Variable X" />
                        <YAxis type="number" dataKey="y" name="Variable Y" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={correlationData} fill="#3b82f6" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 border rounded">
                      <h4 className="font-medium mb-2">Kết quả phân tích</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Hệ số tương quan (r):</span>
                          <span className="font-medium">0.75</span>
                        </div>
                        <div className="flex justify-between">
                          <span>R-squared:</span>
                          <span className="font-medium">0.56</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P-value:</span>
                          <span className="font-medium">&lt; 0.001</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mức độ:</span>
                          <Badge variant="default">Mạnh</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Quan hệ:</span>
                          <Badge variant="secondary">Tích cực</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border rounded">
                      <h4 className="font-medium mb-2">Diễn giải</h4>
                      <p className="text-sm text-muted-foreground">
                        Có mối tương quan mạnh và tích cực giữa hai biến. 
                        Khi Variable X tăng, Variable Y có xu hướng tăng theo.
                        56% sự biến thiên của Y có thể được giải thích bởi X.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Heatmap Performance</CardTitle>
                <CardDescription>
                  Phân bố hiệu suất theo giờ và ngày trong tuần
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2">Ngày</th>
                        {Array.from({ length: 24 }, (_, i) => (
                          <th key={i} className="text-center p-1 text-xs">{i}h</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, dayIndex) => (
                        <tr key={day}>
                          <td className="p-2 font-medium">{day}</td>
                          {heatmapData[dayIndex]?.map((value, hourIndex) => (
                            <td key={hourIndex} className="p-1">
                              <HeatmapCell value={value} maxValue={100} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="text-sm">Thấp</span>
                  <div className="flex">
                    {[0, 25, 50, 75, 100].map((v) => (
                      <div
                        key={v}
                        className="w-8 h-4"
                        style={{
                          backgroundColor: `hsl(${(1 - v / 100) * 120}, 70%, ${50 + v / 100 * 20}%)`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm">Cao</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
