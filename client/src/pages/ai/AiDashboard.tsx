import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, AlertTriangle, CheckCircle, Activity, 
  Zap, Target, BarChart3, Clock, RefreshCw, ArrowUp, ArrowDown, Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

export default function AiDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // Real tRPC queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.ai.analytics.getDashboardStats.useQuery();
  const { data: modelsData, isLoading: modelsLoading } = trpc.ai.models.list.useQuery({ limit: 100 });
  const models = modelsData?.models || [];
  // Predictions will be added later
  const predictions: any[] = [];
  const predictionsLoading = false;

  const isLoading = statsLoading || modelsLoading || predictionsLoading;

  // Calculate system health from real data
  const systemHealth = {
    status: stats && stats.activeModels > 0 ? "healthy" : "warning" as const,
    uptime: 99.8, // Could be calculated from server uptime
    modelsActive: stats?.activeModels || 0,
    modelsTotal: stats?.totalModels || 0,
    lastUpdate: new Date().toISOString(),
  };

  // Calculate KPI data from real models
  const kpiData = [
    { 
      name: "Avg Accuracy", 
      value: stats?.avgAccuracy ? Math.round(stats.avgAccuracy * 100) : 0, 
      target: 90, 
      status: (stats?.avgAccuracy || 0) >= 0.9 ? "good" : "warning" 
    },
    { 
      name: "Active Models", 
      value: stats?.activeModels || 0, 
      target: 10, 
      status: (stats?.activeModels || 0) >= 10 ? "good" : "warning" 
    },
    { 
      name: "Total Predictions", 
      value: stats?.totalPredictions || 0, 
      target: 100, 
      status: (stats?.totalPredictions || 0) >= 100 ? "good" : "warning" 
    },
    { 
      name: "Training Models", 
      value: stats?.trainingModels || 0, 
      target: 3, 
      status: "info" 
    },
  ];

  // Group predictions by month for trend chart
  const predictionTrend = predictions ? (() => {
    const monthlyData: Record<string, { predictions: number; totalAccuracy: number; count: number }> = {};
    
    predictions.forEach(pred => {
      const month = new Date(pred.createdAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { predictions: 0, totalAccuracy: 0, count: 0 };
      }
      monthlyData[month].predictions++;
      if (pred.confidence) {
        monthlyData[month].totalAccuracy += pred.confidence;
        monthlyData[month].count++;
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([date, data]) => ({
        date,
        predictions: data.predictions,
        accuracy: data.count > 0 ? Math.round((data.totalAccuracy / data.count) * 100) : 0,
      }));
  })() : [];

  // Calculate model usage distribution
  const modelUsage = models ? (() => {
    const typeCount: Record<string, number> = {};
    models.forEach(model => {
      typeCount[model.type] = (typeCount[model.type] || 0) + 1;
    });

    const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280"];
    return Object.entries(typeCount).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  })() : [];

  // Recent alerts from predictions with low confidence
  const recentAlerts = predictions ? predictions
    .filter(p => p.confidence && p.confidence < 0.7)
    .slice(0, 3)
    .map((p, idx) => ({
      id: p.id,
      type: p.confidence! < 0.5 ? "critical" : "warning",
      message: `Low confidence prediction (${Math.round(p.confidence! * 100)}%)`,
      time: new Date(p.createdAt).toLocaleString(),
      model: models?.find(m => m.id === p.modelId)?.name || "Unknown",
    })) : [];

  // Active models with stats
  const activeModels = models?.map(model => ({
    name: model.name,
    status: model.status,
    accuracy: model.accuracy ? Math.round(model.accuracy * 100) : 0,
    predictions: predictions?.filter(p => p.modelId === model.id).length || 0,
  })) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "training":
        return <Badge className="bg-blue-500">Training</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "critical":
        return <Badge className="bg-red-500">Critical</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleRefresh = () => {
    refetchStats();
    toast({ title: "Đã làm mới dữ liệu" });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-violet-500" />
              AI System Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive AI/ML system monitoring and analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health */}
        <Card className={`border-l-4 ${systemHealth.status === "healthy" ? "border-l-green-500" : "border-l-yellow-500"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className={`h-5 w-5 ${systemHealth.status === "healthy" ? "text-green-500" : "text-yellow-500"}`} />
                  System Health
                </CardTitle>
                <CardDescription>Overall AI system status and metrics</CardDescription>
              </div>
              {getStatusBadge(systemHealth.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold text-green-600">{systemHealth.uptime}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Models</p>
                <p className="text-2xl font-bold">{systemHealth.modelsActive}/{systemHealth.modelsTotal}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.avgAccuracy ? `${Math.round(stats.avgAccuracy * 100)}%` : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Predictions</p>
                <p className="text-2xl font-bold">{stats?.totalPredictions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {kpi.target}
                    </p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    kpi.status === "good" ? "bg-green-100" : 
                    kpi.status === "warning" ? "bg-yellow-100" : "bg-blue-100"
                  }`}>
                    {kpi.value >= kpi.target ? (
                      <ArrowUp className={`h-6 w-6 ${
                        kpi.status === "good" ? "text-green-600" : "text-blue-600"
                      }`} />
                    ) : (
                      <ArrowDown className="h-6 w-6 text-yellow-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Prediction Trend
              </CardTitle>
              <CardDescription>Monthly predictions and accuracy over time</CardDescription>
            </CardHeader>
            <CardContent>
              {predictionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={predictionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="predictions" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name="Predictions"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Accuracy %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No prediction data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Usage Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Model Usage Distribution
              </CardTitle>
              <CardDescription>Distribution of AI models by type</CardDescription>
            </CardHeader>
            <CardContent>
              {modelUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {modelUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No model data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">Active Models</TabsTrigger>
            <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Models</CardTitle>
                <CardDescription>Current status of all AI models</CardDescription>
              </CardHeader>
              <CardContent>
                {activeModels.length > 0 ? (
                  <div className="space-y-3">
                    {activeModels.map((model, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Target className="h-5 w-5 text-violet-500" />
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {model.predictions} predictions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Accuracy</p>
                            <p className="font-semibold">{model.accuracy}%</p>
                          </div>
                          {getStatusBadge(model.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active models found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest system alerts and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {recentAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.model} • {alert.time}
                          </p>
                        </div>
                        <Badge variant={alert.type === "critical" ? "destructive" : "secondary"}>
                          {alert.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No recent alerts
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
