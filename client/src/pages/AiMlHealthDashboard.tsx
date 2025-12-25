import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Gauge,
  Bell,
  Download,
  Settings,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

// Mock data for demonstration
const mockHealthData = {
  overallHealth: 87,
  models: [
    { id: '1', name: 'CPK Predictor', status: 'healthy', accuracy: 0.94, latency: 45, driftScore: 0.08 },
    { id: '2', name: 'OEE Forecaster', status: 'warning', accuracy: 0.88, latency: 62, driftScore: 0.15 },
    { id: '3', name: 'Defect Classifier', status: 'healthy', accuracy: 0.91, latency: 38, driftScore: 0.05 },
    { id: '4', name: 'Anomaly Detector', status: 'critical', accuracy: 0.72, latency: 120, driftScore: 0.32 }
  ],
  kpis: {
    avgAccuracy: 0.8625,
    avgLatency: 66.25,
    avgDriftScore: 0.15,
    totalPredictions: 125840,
    activeModels: 4,
    alertsToday: 7
  },
  accuracyTrend: [
    { date: '20/12', accuracy: 0.89 },
    { date: '21/12', accuracy: 0.88 },
    { date: '22/12', accuracy: 0.87 },
    { date: '23/12', accuracy: 0.86 },
    { date: '24/12', accuracy: 0.85 },
    { date: '25/12', accuracy: 0.86 }
  ],
  driftTrend: [
    { date: '20/12', drift: 0.08 },
    { date: '21/12', drift: 0.10 },
    { date: '22/12', drift: 0.12 },
    { date: '23/12', drift: 0.14 },
    { date: '24/12', drift: 0.16 },
    { date: '25/12', drift: 0.15 }
  ],
  latencyDistribution: [
    { range: '0-50ms', count: 45 },
    { range: '50-100ms', count: 30 },
    { range: '100-200ms', count: 15 },
    { range: '>200ms', count: 10 }
  ],
  alertsByType: [
    { type: 'Accuracy Drop', count: 12, color: '#ef4444' },
    { type: 'Feature Drift', count: 8, color: '#f97316' },
    { type: 'Prediction Drift', count: 5, color: '#eab308' },
    { type: 'Latency High', count: 3, color: '#3b82f6' }
  ],
  recentAlerts: [
    { id: '1', model: 'Anomaly Detector', type: 'Accuracy Drop', severity: 'critical', time: '10 phút trước', message: 'Accuracy giảm xuống 72%' },
    { id: '2', model: 'OEE Forecaster', type: 'Feature Drift', severity: 'high', time: '1 giờ trước', message: 'Feature drift vượt ngưỡng 15%' },
    { id: '3', model: 'CPK Predictor', type: 'Latency High', severity: 'medium', time: '2 giờ trước', message: 'Latency tăng lên 120ms' }
  ]
};

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

export default function AiMlHealthDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  const getTrendIcon = (current: number, threshold: number, inverse: boolean = false) => {
    if (inverse) {
      if (current > threshold * 1.1) return <TrendingUp className="h-4 w-4 text-red-500" />;
      if (current < threshold * 0.9) return <TrendingDown className="h-4 w-4 text-green-500" />;
    } else {
      if (current > threshold * 1.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
      if (current < threshold * 0.9) return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const healthGaugeData = [
    { name: 'Health', value: mockHealthData.overallHealth, fill: mockHealthData.overallHealth > 80 ? '#22c55e' : mockHealthData.overallHealth > 60 ? '#eab308' : '#ef4444' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI/ML Health Dashboard
            </h1>
            <p className="text-muted-foreground">Giám sát tổng hợp sức khỏe các model AI/ML</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overall Health Gauge + KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Health Gauge */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sức khỏe Tổng thể</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="80%"
                    barSize={10}
                    data={healthGaugeData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-10">
                <span className="text-3xl font-bold">{mockHealthData.overallHealth}%</span>
                <p className="text-sm text-muted-foreground">
                  {mockHealthData.overallHealth > 80 ? 'Tốt' : mockHealthData.overallHealth > 60 ? 'Trung bình' : 'Cần chú ý'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Accuracy TB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{(mockHealthData.kpis.avgAccuracy * 100).toFixed(1)}%</span>
                {getTrendIcon(mockHealthData.kpis.avgAccuracy, 0.85)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: 85%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Latency TB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{mockHealthData.kpis.avgLatency.toFixed(0)}ms</span>
                {getTrendIcon(mockHealthData.kpis.avgLatency, 100, true)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: &lt;100ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Drift Score TB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{(mockHealthData.kpis.avgDriftScore * 100).toFixed(1)}%</span>
                {getTrendIcon(mockHealthData.kpis.avgDriftScore, 0.1, true)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Target: &lt;10%</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Predictions</p>
                  <p className="text-2xl font-bold">{mockHealthData.kpis.totalPredictions.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Models Active</p>
                  <p className="text-2xl font-bold">{mockHealthData.kpis.activeModels}</p>
                </div>
                <Brain className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alerts Hôm nay</p>
                  <p className="text-2xl font-bold">{mockHealthData.kpis.alertsToday}</p>
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Phân bố
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Cảnh báo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Accuracy Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Xu hướng Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHealthData.accuracyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0.8, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                        <Area type="monotone" dataKey="accuracy" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Drift Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Xu hướng Drift Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHealthData.driftTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 0.3]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                        <Area type="monotone" dataKey="drift" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Latency Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Phân bố Latency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockHealthData.latencyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Model Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Trạng thái Models</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockHealthData.models.map((model) => (
                      <div key={model.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)}`} />
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Accuracy: {(model.accuracy * 100).toFixed(0)}% | Latency: {model.latency}ms
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(model.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alerts by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cảnh báo theo Loại</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mockHealthData.alertsByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          dataKey="count"
                          nameKey="type"
                          label={({ type, count }) => `${type}: ${count}`}
                        >
                          {mockHealthData.alertsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cảnh báo Gần đây</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockHealthData.recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                          alert.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                          'border-l-yellow-500 bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{alert.model}</span>
                          <span className="text-xs text-muted-foreground">{alert.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{alert.type}</Badge>
                          <Badge className={
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết Models</CardTitle>
            <CardDescription>Danh sách tất cả models và trạng thái hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Model</th>
                    <th className="text-left py-3 px-4">Trạng thái</th>
                    <th className="text-right py-3 px-4">Accuracy</th>
                    <th className="text-right py-3 px-4">Latency</th>
                    <th className="text-right py-3 px-4">Drift Score</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockHealthData.models.map((model) => (
                    <tr key={model.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{model.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(model.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={model.accuracy < 0.8 ? 'text-red-500' : model.accuracy < 0.9 ? 'text-yellow-500' : 'text-green-500'}>
                          {(model.accuracy * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={model.latency > 100 ? 'text-red-500' : model.latency > 50 ? 'text-yellow-500' : 'text-green-500'}>
                          {model.latency}ms
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={model.driftScore > 0.2 ? 'text-red-500' : model.driftScore > 0.1 ? 'text-yellow-500' : 'text-green-500'}>
                          {(model.driftScore * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
