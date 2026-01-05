/**
 * MTTR/MTBF Prediction Page
 * Trang dự đoán xu hướng MTTR/MTBF bằng AI
 */
import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Lightbulb,
  Target,
  Wrench,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
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
  Bar,
  ReferenceLine,
} from 'recharts';

// Mock targets for demo
const mockTargets = {
  device: [
    { id: 1, name: 'PLC-001' },
    { id: 2, name: 'Sensor-002' },
    { id: 3, name: 'Gateway-003' },
  ],
  machine: [
    { id: 1, name: 'CNC-001' },
    { id: 2, name: 'Lathe-002' },
    { id: 3, name: 'Mill-003' },
  ],
  production_line: [
    { id: 1, name: 'Line A' },
    { id: 2, name: 'Line B' },
    { id: 3, name: 'Line C' },
  ],
};

const TrendIcon = ({ trend }: { trend: 'improving' | 'stable' | 'declining' }) => {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-yellow-500" />;
};

const TrendBadge = ({ trend, label }: { trend: 'improving' | 'stable' | 'declining'; label: string }) => {
  const colors = {
    improving: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    stable: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    declining: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels = {
    improving: 'Cải thiện',
    stable: 'Ổn định',
    declining: 'Giảm sút',
  };
  return (
    <Badge className={colors[trend]}>
      <TrendIcon trend={trend} />
      <span className="ml-1">{label}: {labels[trend]}</span>
    </Badge>
  );
};

const RiskBadge = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const colors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };
  const labels = {
    low: 'Rủi ro thấp',
    medium: 'Rủi ro trung bình',
    high: 'Rủi ro cao',
  };
  return (
    <Badge className={`${colors[level]} text-white`}>
      {labels[level]}
    </Badge>
  );
};

export default function MttrMtbfPrediction() {
  const [targetType, setTargetType] = useState<'device' | 'machine' | 'production_line'>('machine');
  const [targetId, setTargetId] = useState<number>(1);
  const [historicalDays, setHistoricalDays] = useState(30);
  const [predictionDays, setPredictionDays] = useState(7);
  const { toast } = useToast();

  const targets = mockTargets[targetType];
  const selectedTarget = targets.find(t => t.id === targetId) || targets[0];

  // Query prediction with AI recommendations
  const { data, isLoading, refetch, isFetching } = trpc.mttrMtbfPrediction.getAIRecommendations.useQuery({
    targetType,
    targetId,
    targetName: selectedTarget?.name || '',
    historicalDays,
    predictionDays,
  }, {
    enabled: !!selectedTarget,
    staleTime: 60000,
  });

  // Combine historical and prediction data for charts
  const chartData = useMemo(() => {
    if (!data) return [];
    
    const historical = data.historical.map(d => ({
      date: d.date,
      mttr: d.mttr,
      mtbf: d.mtbf,
      availability: d.availability ? d.availability * 100 : null,
      type: 'historical',
    }));

    const predictions = data.predictions.map(p => ({
      date: p.date,
      predictedMttr: p.predictedMttr,
      predictedMtbf: p.predictedMtbf,
      predictedAvailability: p.predictedAvailability ? p.predictedAvailability * 100 : null,
      confidence: p.confidence * 100,
      type: 'prediction',
    }));

    return [...historical, ...predictions];
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data?.historical.length) return null;
    
    const mttrValues = data.historical.map(d => d.mttr).filter((v): v is number => v !== null);
    const mtbfValues = data.historical.map(d => d.mtbf).filter((v): v is number => v !== null);
    const availValues = data.historical.map(d => d.availability).filter((v): v is number => v !== null);

    return {
      avgMttr: mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length,
      avgMtbf: mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length,
      avgAvailability: availValues.reduce((a, b) => a + b, 0) / availValues.length * 100,
      lastMttr: mttrValues[mttrValues.length - 1],
      lastMtbf: mtbfValues[mtbfValues.length - 1],
      predictedMttr: data.predictions[data.predictions.length - 1]?.predictedMttr,
      predictedMtbf: data.predictions[data.predictions.length - 1]?.predictedMtbf,
    };
  }, [data]);

  const targetTypeLabel = {
    device: 'Thiết bị IoT',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
  }[targetType];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              Dự đoán Xu hướng MTTR/MTBF
            </h1>
            <p className="text-muted-foreground">
              Phân tích và dự đoán xu hướng bằng AI
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Làm mới
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Loại đối tượng</Label>
                <Select value={targetType} onValueChange={(v: any) => { setTargetType(v); setTargetId(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="device">Thiết bị IoT</SelectItem>
                    <SelectItem value="machine">Máy móc</SelectItem>
                    <SelectItem value="production_line">Dây chuyền</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Đối tượng</Label>
                <Select value={targetId.toString()} onValueChange={(v) => setTargetId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dữ liệu lịch sử</Label>
                <Select value={historicalDays.toString()} onValueChange={(v) => setHistoricalDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="60">60 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dự đoán</Label>
                <Select value={predictionDays.toString()} onValueChange={(v) => setPredictionDays(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 ngày</SelectItem>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Đang phân tích dữ liệu và tạo dự đoán...</p>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Trend Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">MTTR</p>
                      <p className="text-2xl font-bold">{stats?.avgMttr.toFixed(1)} phút</p>
                      <p className="text-sm text-muted-foreground">
                        Dự đoán: {stats?.predictedMttr?.toFixed(1) || 'N/A'} phút
                      </p>
                    </div>
                    <TrendBadge trend={data.trendAnalysis.mttrTrend} label="MTTR" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">MTBF</p>
                      <p className="text-2xl font-bold">{stats?.avgMtbf.toFixed(1)} phút</p>
                      <p className="text-sm text-muted-foreground">
                        Dự đoán: {stats?.predictedMtbf?.toFixed(1) || 'N/A'} phút
                      </p>
                    </div>
                    <TrendBadge trend={data.trendAnalysis.mtbfTrend} label="MTBF" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Availability</p>
                      <p className="text-2xl font-bold">{stats?.avgAvailability.toFixed(1)}%</p>
                    </div>
                    <TrendBadge trend={data.trendAnalysis.availabilityTrend} label="Avail" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            {data.recommendations && (
              <Card className="border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    Phân tích AI
                    <RiskBadge level={data.recommendations.riskLevel} />
                  </CardTitle>
                  <CardDescription>{data.recommendations.summary}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recommendations */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Khuyến nghị
                      </h4>
                      <ul className="space-y-2">
                        {data.recommendations.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Predicted Issues */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Vấn đề tiềm ẩn
                      </h4>
                      <ul className="space-y-2">
                        {data.recommendations.predictedIssues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Maintenance Advice */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-blue-500" />
                        Lời khuyên bảo trì
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {data.recommendations.maintenanceAdvice}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <Tabs defaultValue="mttr" className="space-y-4">
              <TabsList>
                <TabsTrigger value="mttr">
                  <Clock className="w-4 h-4 mr-2" />
                  MTTR
                </TabsTrigger>
                <TabsTrigger value="mtbf">
                  <Activity className="w-4 h-4 mr-2" />
                  MTBF
                </TabsTrigger>
                <TabsTrigger value="combined">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Tổng hợp
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mttr">
                <Card>
                  <CardHeader>
                    <CardTitle>Xu hướng MTTR</CardTitle>
                    <CardDescription>
                      Dữ liệu lịch sử và dự đoán MTTR (Mean Time To Repair)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis label={{ value: 'MTTR (phút)', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            labelFormatter={(v) => new Date(v).toLocaleDateString('vi-VN')}
                            formatter={(value: any, name: string) => [
                              `${value?.toFixed(1)} phút`,
                              name === 'mttr' ? 'MTTR thực tế' : 'MTTR dự đoán'
                            ]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="mttr" 
                            name="MTTR thực tế"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="predictedMttr" 
                            name="MTTR dự đoán"
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                          />
                          <ReferenceLine 
                            y={stats?.avgMttr} 
                            stroke="#ef4444" 
                            strokeDasharray="3 3"
                            label={{ value: 'TB', position: 'right' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mtbf">
                <Card>
                  <CardHeader>
                    <CardTitle>Xu hướng MTBF</CardTitle>
                    <CardDescription>
                      Dữ liệu lịch sử và dự đoán MTBF (Mean Time Between Failures)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis label={{ value: 'MTBF (phút)', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            labelFormatter={(v) => new Date(v).toLocaleDateString('vi-VN')}
                            formatter={(value: any, name: string) => [
                              `${value?.toFixed(1)} phút`,
                              name === 'mtbf' ? 'MTBF thực tế' : 'MTBF dự đoán'
                            ]}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="mtbf" 
                            name="MTBF thực tế"
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="predictedMtbf" 
                            name="MTBF dự đoán"
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                          />
                          <ReferenceLine 
                            y={stats?.avgMtbf} 
                            stroke="#ef4444" 
                            strokeDasharray="3 3"
                            label={{ value: 'TB', position: 'right' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="combined">
                <Card>
                  <CardHeader>
                    <CardTitle>Tổng hợp MTTR/MTBF</CardTitle>
                    <CardDescription>
                      So sánh xu hướng MTTR và MTBF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(v) => new Date(v).toLocaleDateString('vi-VN')}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="mttr" 
                            name="MTTR"
                            stroke="#3b82f6" 
                            fill="#3b82f6"
                            fillOpacity={0.3}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="mtbf" 
                            name="MTBF"
                            stroke="#22c55e" 
                            fill="#22c55e"
                            fillOpacity={0.3}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="predictedMttr" 
                            name="MTTR dự đoán"
                            stroke="#8b5cf6" 
                            fill="#8b5cf6"
                            fillOpacity={0.2}
                            strokeDasharray="5 5"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="predictedMtbf" 
                            name="MTBF dự đoán"
                            stroke="#a855f7" 
                            fill="#a855f7"
                            fillOpacity={0.2}
                            strokeDasharray="5 5"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Prediction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết dự đoán</CardTitle>
                <CardDescription>
                  Dự đoán {predictionDays} ngày tới cho {selectedTarget?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {data.predictions.map((pred, i) => (
                    <Card key={i} className={`${
                      pred.trend === 'improving' ? 'border-green-200 dark:border-green-800' :
                      pred.trend === 'declining' ? 'border-red-200 dark:border-red-800' :
                      'border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <CardContent className="pt-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {new Date(pred.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm">
                            <span className="text-muted-foreground">MTTR:</span>{' '}
                            <span className="font-medium">{pred.predictedMttr?.toFixed(0)}p</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">MTBF:</span>{' '}
                            <span className="font-medium">{pred.predictedMtbf?.toFixed(0)}p</span>
                          </p>
                        </div>
                        <div className="mt-2">
                          <TrendIcon trend={pred.trend} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Độ tin cậy: {(pred.confidence * 100).toFixed(0)}%
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Chọn đối tượng để xem dự đoán</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
