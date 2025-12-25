import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Cpu,
  Database,
  Layers
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  Cell,
  PieChart as RechartsPieChart,
  Pie
} from "recharts";

// Types
interface ModelMetrics {
  modelId: string;
  name: string;
  type: string;
  framework: string;
  accuracy: number;
  loss?: number;
  r2Score?: number;
  mse?: number;
  predictions: number;
  errors: number;
  lastUsed: string;
  createdAt: string;
  status: string;
}

interface PerformanceHistory {
  date: string;
  accuracy: number;
  predictions: number;
  errors: number;
  latency: number;
}

// Mock data for demonstration
const mockModels: ModelMetrics[] = [
  {
    modelId: "cpk_pred_tf_001",
    name: "CPK Predictor v1",
    type: "cpk_prediction",
    framework: "tensorflow",
    accuracy: 0.92,
    loss: 0.08,
    predictions: 15420,
    errors: 123,
    lastUsed: new Date().toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  {
    modelId: "spc_class_tf_001",
    name: "SPC Rule Classifier",
    type: "spc_classification",
    framework: "tensorflow",
    accuracy: 0.89,
    loss: 0.11,
    predictions: 8932,
    errors: 89,
    lastUsed: new Date().toISOString(),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  {
    modelId: "anomaly_sk_001",
    name: "Anomaly Detector",
    type: "anomaly_detection",
    framework: "sklearn",
    accuracy: 0.87,
    r2Score: 0.85,
    mse: 0.023,
    predictions: 12500,
    errors: 156,
    lastUsed: new Date().toISOString(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  {
    modelId: "cpk_gb_001",
    name: "CPK Gradient Boost",
    type: "cpk_prediction",
    framework: "sklearn",
    accuracy: 0.91,
    r2Score: 0.89,
    mse: 0.018,
    predictions: 6780,
    errors: 67,
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  },
  {
    modelId: "cpk_rf_001",
    name: "CPK Random Forest",
    type: "cpk_prediction",
    framework: "sklearn",
    accuracy: 0.88,
    r2Score: 0.86,
    predictions: 4520,
    errors: 45,
    lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "training"
  }
];

// Generate mock performance history
const generatePerformanceHistory = (days: number): PerformanceHistory[] => {
  const history: PerformanceHistory[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    history.push({
      date: date.toISOString().split('T')[0],
      accuracy: 0.85 + Math.random() * 0.1,
      predictions: Math.floor(500 + Math.random() * 500),
      errors: Math.floor(Math.random() * 20),
      latency: 50 + Math.random() * 100
    });
  }
  return history;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AiAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30");
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [selectedModelType, setSelectedModelType] = useState("all");

  // Get AI stats from API
  const { data: aiStats } = trpc.ai.getStats.useQuery();
  const { data: dbModels } = trpc.ai.listModels.useQuery({});

  // Combine mock data with real data
  const models = useMemo(() => {
    // Use mock data for demonstration
    return mockModels;
  }, [dbModels]);

  const performanceHistory = useMemo(() => {
    return generatePerformanceHistory(parseInt(timeRange));
  }, [timeRange]);

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (selectedFramework !== "all" && m.framework !== selectedFramework) return false;
      if (selectedModelType !== "all" && m.type !== selectedModelType) return false;
      return true;
    });
  }, [models, selectedFramework, selectedModelType]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const activeModels = models.filter(m => m.status === "active");
    const totalPredictions = models.reduce((sum, m) => sum + m.predictions, 0);
    const totalErrors = models.reduce((sum, m) => sum + m.errors, 0);
    const avgAccuracy = activeModels.reduce((sum, m) => sum + m.accuracy, 0) / activeModels.length;
    
    return {
      totalModels: models.length,
      activeModels: activeModels.length,
      trainingModels: models.filter(m => m.status === "training").length,
      totalPredictions,
      totalErrors,
      avgAccuracy,
      errorRate: totalErrors / totalPredictions * 100
    };
  }, [models]);

  // Model type distribution
  const modelTypeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    models.forEach(m => {
      distribution[m.type] = (distribution[m.type] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [models]);

  // Framework distribution
  const frameworkDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    models.forEach(m => {
      distribution[m.framework] = (distribution[m.framework] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [models]);

  // Accuracy comparison data
  const accuracyComparison = useMemo(() => {
    return filteredModels.map(m => ({
      name: m.name.substring(0, 15),
      accuracy: m.accuracy * 100,
      errorRate: m.errors / m.predictions * 100,
      predictions: m.predictions
    }));
  }, [filteredModels]);

  // Radar chart data for model comparison
  const radarData = useMemo(() => {
    const metrics = ['Accuracy', 'Predictions', 'Reliability', 'Speed', 'Stability'];
    return metrics.map(metric => {
      const data: Record<string, number | string> = { metric };
      filteredModels.slice(0, 4).forEach(m => {
        switch (metric) {
          case 'Accuracy':
            data[m.name] = m.accuracy * 100;
            break;
          case 'Predictions':
            data[m.name] = Math.min(100, m.predictions / 200);
            break;
          case 'Reliability':
            data[m.name] = (1 - m.errors / m.predictions) * 100;
            break;
          case 'Speed':
            data[m.name] = 85 + Math.random() * 15;
            break;
          case 'Stability':
            data[m.name] = 80 + Math.random() * 20;
            break;
        }
      });
      return data;
    });
  }, [filteredModels]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case "training":
        return <Badge className="bg-yellow-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Training</Badge>;
      case "failed":
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case "tensorflow":
        return <Brain className="w-4 h-4 text-orange-500" />;
      case "sklearn":
        return <Cpu className="w-4 h-4 text-blue-500" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              AI Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi hiệu suất và so sánh các ML models
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng Models</CardTitle>
              <Layers className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalModels}</div>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-green-600">
                  {summaryStats.activeModels} active
                </Badge>
                <Badge variant="outline" className="text-yellow-600">
                  {summaryStats.trainingModels} training
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng Predictions</CardTitle>
              <Target className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalPredictions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-red-500">{summaryStats.totalErrors}</span> errors ({summaryStats.errorRate.toFixed(2)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Accuracy Trung bình</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summaryStats.avgAccuracy * 100).toFixed(1)}%
              </div>
              <Progress value={summaryStats.avgAccuracy * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.errorRate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.errorRate < 1 ? (
                  <span className="text-green-500">Excellent performance</span>
                ) : summaryStats.errorRate < 5 ? (
                  <span className="text-yellow-500">Good performance</span>
                ) : (
                  <span className="text-red-500">Needs attention</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="performance">
              <LineChart className="w-4 h-4 mr-2" />
              Hiệu suất
            </TabsTrigger>
            <TabsTrigger value="comparison">
              <PieChart className="w-4 h-4 mr-2" />
              So sánh
            </TabsTrigger>
            <TabsTrigger value="models">
              <Database className="w-4 h-4 mr-2" />
              Chi tiết Models
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Accuracy Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Accuracy Trend</CardTitle>
                  <CardDescription>Xu hướng accuracy theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="accuracy" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="Accuracy (%)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Predictions & Errors */}
              <Card>
                <CardHeader>
                  <CardTitle>Predictions & Errors</CardTitle>
                  <CardDescription>Số lượng predictions và errors theo ngày</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="predictions" fill="#10b981" name="Predictions" />
                      <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ef4444" name="Errors" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Model Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố Model Types</CardTitle>
                  <CardDescription>Số lượng models theo loại</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={modelTypeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {modelTypeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Framework Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố Frameworks</CardTitle>
                  <CardDescription>TensorFlow vs Sklearn</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={frameworkDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {frameworkDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === 'tensorflow' ? '#f97316' : '#3b82f6'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Latency Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Latency</CardTitle>
                  <CardDescription>Thời gian phản hồi trung bình (ms)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={performanceHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="latency" 
                        stroke="#8b5cf6" 
                        name="Latency (ms)"
                        dot={false}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Accuracy by Model */}
              <Card>
                <CardHeader>
                  <CardTitle>Accuracy theo Model</CardTitle>
                  <CardDescription>So sánh accuracy giữa các models</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={accuracyComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <div className="flex gap-4 mb-4">
              <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Frameworks</SelectItem>
                  <SelectItem value="tensorflow">TensorFlow</SelectItem>
                  <SelectItem value="sklearn">Sklearn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedModelType} onValueChange={setSelectedModelType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Model Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Types</SelectItem>
                  <SelectItem value="cpk_prediction">CPK Prediction</SelectItem>
                  <SelectItem value="spc_classification">SPC Classification</SelectItem>
                  <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Model Comparison Radar</CardTitle>
                  <CardDescription>So sánh đa chiều giữa các models</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {filteredModels.slice(0, 4).map((m, idx) => (
                        <Radar
                          key={m.modelId}
                          name={m.name}
                          dataKey={m.name}
                          stroke={COLORS[idx]}
                          fill={COLORS[idx]}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Error Rate Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Rate Comparison</CardTitle>
                  <CardDescription>Tỷ lệ lỗi của từng model</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={accuracyComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Models Detail Tab */}
          <TabsContent value="models" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map(model => (
                <Card key={model.modelId} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFrameworkIcon(model.framework)}
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                      </div>
                      {getStatusBadge(model.status)}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline">{model.type}</Badge>
                      <Badge variant="outline">{model.framework}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Accuracy */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuracy</span>
                        <span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={model.accuracy * 100} className="h-2" />
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span>{model.predictions.toLocaleString()} predictions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span>{model.errors} errors</span>
                      </div>
                      {model.r2Score !== undefined && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span>R² = {model.r2Score.toFixed(3)}</span>
                        </div>
                      )}
                      {model.mse !== undefined && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <span>MSE = {model.mse.toFixed(4)}</span>
                        </div>
                      )}
                    </div>

                    {/* Last Used */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Last used: {new Date(model.lastUsed).toLocaleString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Activity className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retrain
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
