import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Cpu,
  Database
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
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';

// Mock AI Models
const AI_MODELS = [
  { 
    id: 'spc-predictor-v1', 
    name: 'SPC Predictor v1', 
    type: 'regression',
    version: '1.0.0',
    status: 'active',
    deployedAt: '2024-01-15'
  },
  { 
    id: 'spc-predictor-v2', 
    name: 'SPC Predictor v2', 
    type: 'regression',
    version: '2.0.0',
    status: 'active',
    deployedAt: '2024-06-01'
  },
  { 
    id: 'anomaly-detector', 
    name: 'Anomaly Detector', 
    type: 'classification',
    version: '1.2.0',
    status: 'active',
    deployedAt: '2024-03-20'
  },
  { 
    id: 'trend-analyzer', 
    name: 'Trend Analyzer', 
    type: 'time-series',
    version: '1.1.0',
    status: 'testing',
    deployedAt: '2024-08-10'
  },
  { 
    id: 'quality-classifier', 
    name: 'Quality Classifier', 
    type: 'classification',
    version: '2.1.0',
    status: 'active',
    deployedAt: '2024-05-15'
  }
];

// Generate mock performance data over time
const generatePerformanceHistory = (modelId: string, days: number) => {
  const data = [];
  const baseAccuracy = modelId.includes('v2') ? 0.92 : modelId.includes('v1') ? 0.85 : 0.88;
  const basePrecision = baseAccuracy - 0.02;
  const baseRecall = baseAccuracy + 0.01;
  const baseF1 = (2 * basePrecision * baseRecall) / (basePrecision + baseRecall);
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some variance
    const variance = (Math.random() - 0.5) * 0.08;
    const trend = (days - i) / days * 0.03; // Slight improvement over time
    
    data.push({
      date: date.toISOString().split('T')[0],
      accuracy: Math.min(0.99, Math.max(0.7, baseAccuracy + variance + trend)),
      precision: Math.min(0.99, Math.max(0.7, basePrecision + variance + trend)),
      recall: Math.min(0.99, Math.max(0.7, baseRecall + variance + trend)),
      f1Score: Math.min(0.99, Math.max(0.7, baseF1 + variance + trend)),
      latency: 50 + Math.random() * 100,
      predictions: Math.floor(1000 + Math.random() * 5000),
      errors: Math.floor(Math.random() * 50)
    });
  }
  
  return data;
};

// Model comparison data
const generateComparisonData = () => {
  return AI_MODELS.map(model => {
    const baseScore = model.id.includes('v2') ? 92 : model.id.includes('v1') ? 85 : 88;
    return {
      model: model.name,
      accuracy: baseScore + Math.random() * 5,
      precision: baseScore - 2 + Math.random() * 5,
      recall: baseScore + 1 + Math.random() * 5,
      f1Score: baseScore - 1 + Math.random() * 5,
      latency: 30 + Math.random() * 70,
      throughput: 500 + Math.random() * 1000
    };
  });
};

// Radar chart data for model comparison
const generateRadarData = (models: string[]) => {
  const metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'Speed', 'Stability'];
  return metrics.map(metric => {
    const data: Record<string, any> = { metric };
    models.forEach(model => {
      data[model] = 60 + Math.random() * 35;
    });
    return data;
  });
};

// Model Card Component
const ModelCard: React.FC<{
  model: typeof AI_MODELS[0];
  performance: ReturnType<typeof generatePerformanceHistory>[0];
  isSelected: boolean;
  onSelect: () => void;
}> = ({ model, performance, isSelected, onSelect }) => {
  const accuracyTrend = performance.accuracy > 0.9 ? 'up' : performance.accuracy < 0.8 ? 'down' : 'stable';
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{model.name}</CardTitle>
              <CardDescription className="text-xs">v{model.version}</CardDescription>
            </div>
          </div>
          <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
            {model.status === 'active' ? 'Hoạt động' : 'Thử nghiệm'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Accuracy */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Độ chính xác</span>
              <span className="font-medium flex items-center gap-1">
                {(performance.accuracy * 100).toFixed(1)}%
                {accuracyTrend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                {accuracyTrend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
              </span>
            </div>
            <Progress value={performance.accuracy * 100} className="h-2" />
          </div>
          
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Precision</p>
              <p className="text-sm font-medium">{(performance.precision * 100).toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Recall</p>
              <p className="text-sm font-medium">{(performance.recall * 100).toFixed(1)}%</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Latency</p>
              <p className="text-sm font-medium">{performance.latency.toFixed(0)}ms</p>
            </div>
          </div>
          
          {/* Predictions today */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dự đoán hôm nay</span>
            <span className="font-medium">{performance.predictions.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export default function AiModelPerformance() {
  const [selectedModels, setSelectedModels] = useState<string[]>(['spc-predictor-v2', 'spc-predictor-v1']);
  const [timeRange, setTimeRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('accuracy');
  
  // Generate data
  const performanceData = useMemo(() => {
    const data: Record<string, ReturnType<typeof generatePerformanceHistory>> = {};
    AI_MODELS.forEach(model => {
      data[model.id] = generatePerformanceHistory(model.id, parseInt(timeRange));
    });
    return data;
  }, [timeRange]);
  
  const comparisonData = useMemo(() => generateComparisonData(), []);
  const radarData = useMemo(() => generateRadarData(selectedModels.map(id => 
    AI_MODELS.find(m => m.id === id)?.name || id
  )), [selectedModels]);
  
  // Combined chart data
  const combinedChartData = useMemo(() => {
    if (selectedModels.length === 0) return [];
    
    const firstModelData = performanceData[selectedModels[0]] || [];
    return firstModelData.map((item, index) => {
      const combined: Record<string, any> = { date: item.date };
      selectedModels.forEach(modelId => {
        const modelData = performanceData[modelId]?.[index];
        if (modelData) {
          const modelName = AI_MODELS.find(m => m.id === modelId)?.name || modelId;
          combined[modelName] = modelData[selectedMetric as keyof typeof modelData];
        }
      });
      return combined;
    });
  }, [selectedModels, performanceData, selectedMetric]);
  
  // Latest performance for each model
  const latestPerformance = useMemo(() => {
    const latest: Record<string, ReturnType<typeof generatePerformanceHistory>[0]> = {};
    AI_MODELS.forEach(model => {
      const data = performanceData[model.id];
      if (data && data.length > 0) {
        latest[model.id] = data[data.length - 1];
      }
    });
    return latest;
  }, [performanceData]);
  
  // Stats
  const stats = useMemo(() => {
    const activeModels = AI_MODELS.filter(m => m.status === 'active').length;
    const avgAccuracy = Object.values(latestPerformance).reduce((sum, p) => sum + p.accuracy, 0) / Object.keys(latestPerformance).length;
    const totalPredictions = Object.values(latestPerformance).reduce((sum, p) => sum + p.predictions, 0);
    const avgLatency = Object.values(latestPerformance).reduce((sum, p) => sum + p.latency, 0) / Object.keys(latestPerformance).length;
    
    return { activeModels, avgAccuracy, totalPredictions, avgLatency };
  }, [latestPerformance]);
  
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), modelId];
      }
      return [...prev, modelId];
    });
  };
  
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Model Performance</h1>
            <p className="text-muted-foreground">So sánh độ chính xác của các AI models theo thời gian</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Models hoạt động</p>
                  <p className="text-2xl font-bold">{stats.activeModels}</p>
                </div>
                <Brain className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Độ chính xác TB</p>
                  <p className="text-2xl font-bold text-green-500">{(stats.avgAccuracy * 100).toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dự đoán hôm nay</p>
                  <p className="text-2xl font-bold">{stats.totalPredictions.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Latency TB</p>
                  <p className="text-2xl font-bold">{stats.avgLatency.toFixed(0)}ms</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chọn Models để so sánh</CardTitle>
            <CardDescription>Chọn tối đa 4 models để so sánh hiệu suất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {AI_MODELS.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  performance={latestPerformance[model.id] || {
                    accuracy: 0, precision: 0, recall: 0, f1Score: 0,
                    latency: 0, predictions: 0, errors: 0, date: ''
                  }}
                  isSelected={selectedModels.includes(model.id)}
                  onSelect={() => toggleModelSelection(model.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Charts */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart3 className="h-4 w-4 mr-2" />
              So sánh
            </TabsTrigger>
            <TabsTrigger value="radar">
              <Target className="h-4 w-4 mr-2" />
              Đa chiều
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Xu hướng hiệu suất theo thời gian</CardTitle>
                    <CardDescription>So sánh {selectedModels.length} models đã chọn</CardDescription>
                  </div>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accuracy">Accuracy</SelectItem>
                      <SelectItem value="precision">Precision</SelectItem>
                      <SelectItem value="recall">Recall</SelectItem>
                      <SelectItem value="f1Score">F1 Score</SelectItem>
                      <SelectItem value="latency">Latency (ms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        domain={selectedMetric === 'latency' ? ['auto', 'auto'] : [0.7, 1]}
                        tickFormatter={(value) => selectedMetric === 'latency' ? `${value}ms` : `${(value * 100).toFixed(0)}%`}
                      />
                      <Tooltip 
                        formatter={(value: number) => selectedMetric === 'latency' 
                          ? `${value.toFixed(0)}ms` 
                          : `${(value * 100).toFixed(2)}%`
                        }
                        labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                      />
                      <Legend />
                      {selectedModels.map((modelId, index) => {
                        const modelName = AI_MODELS.find(m => m.id === modelId)?.name || modelId;
                        return (
                          <Line
                            key={modelId}
                            type="monotone"
                            dataKey={modelName}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                          />
                        );
                      })}
                      {selectedMetric !== 'latency' && (
                        <ReferenceLine y={0.9} stroke="#ef4444" strokeDasharray="5 5" label="Target 90%" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>So sánh hiệu suất các Models</CardTitle>
                <CardDescription>Biểu đồ cột so sánh các chỉ số chính</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="model" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="accuracy" name="Accuracy" fill="#8884d8" />
                      <Bar dataKey="precision" name="Precision" fill="#82ca9d" />
                      <Bar dataKey="recall" name="Recall" fill="#ffc658" />
                      <Bar dataKey="f1Score" name="F1 Score" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="radar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích đa chiều</CardTitle>
                <CardDescription>So sánh các khía cạnh hiệu suất của models đã chọn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {selectedModels.map((modelId, index) => {
                        const modelName = AI_MODELS.find(m => m.id === modelId)?.name || modelId;
                        return (
                          <Radar
                            key={modelId}
                            name={modelName}
                            dataKey={modelName}
                            stroke={COLORS[index % COLORS.length]}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.2}
                          />
                        );
                      })}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Detailed Stats Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết hiệu suất Models</CardTitle>
            <CardDescription>Thống kê chi tiết của tất cả models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Model</th>
                    <th className="text-center py-3 px-4 font-medium">Version</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-center py-3 px-4 font-medium">Accuracy</th>
                    <th className="text-center py-3 px-4 font-medium">Precision</th>
                    <th className="text-center py-3 px-4 font-medium">Recall</th>
                    <th className="text-center py-3 px-4 font-medium">F1 Score</th>
                    <th className="text-center py-3 px-4 font-medium">Latency</th>
                    <th className="text-center py-3 px-4 font-medium">Predictions</th>
                  </tr>
                </thead>
                <tbody>
                  {AI_MODELS.map(model => {
                    const perf = latestPerformance[model.id];
                    if (!perf) return null;
                    
                    return (
                      <tr key={model.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="font-medium">{model.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant="outline">v{model.version}</Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge variant={model.status === 'active' ? 'default' : 'secondary'}>
                            {model.status === 'active' ? 'Hoạt động' : 'Thử nghiệm'}
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={cn(
                            'font-medium',
                            perf.accuracy >= 0.9 ? 'text-green-500' : 
                            perf.accuracy >= 0.8 ? 'text-yellow-500' : 'text-red-500'
                          )}>
                            {(perf.accuracy * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{(perf.precision * 100).toFixed(1)}%</td>
                        <td className="text-center py-3 px-4">{(perf.recall * 100).toFixed(1)}%</td>
                        <td className="text-center py-3 px-4">{(perf.f1Score * 100).toFixed(1)}%</td>
                        <td className="text-center py-3 px-4">{perf.latency.toFixed(0)}ms</td>
                        <td className="text-center py-3 px-4">{perf.predictions.toLocaleString()}</td>
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
