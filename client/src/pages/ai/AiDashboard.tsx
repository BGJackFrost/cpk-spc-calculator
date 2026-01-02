import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, AlertTriangle, CheckCircle, Activity, 
  Zap, Target, BarChart3, Clock, RefreshCw, ArrowUp, ArrowDown
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

  // Mock data - replace with real tRPC queries
  const systemHealth = {
    status: "healthy" as const,
    uptime: 99.8,
    modelsActive: 12,
    modelsTotal: 15,
    lastUpdate: new Date().toISOString(),
  };

  const kpiData = [
    { name: "Accuracy", value: 94.5, target: 90, status: "good" },
    { name: "Precision", value: 92.3, target: 90, status: "good" },
    { name: "Recall", value: 88.7, target: 85, status: "good" },
    { name: "F1 Score", value: 90.4, target: 87, status: "good" },
  ];

  const predictionTrend = [
    { date: "2024-01", predictions: 1200, accuracy: 92 },
    { date: "2024-02", predictions: 1450, accuracy: 93 },
    { date: "2024-03", predictions: 1680, accuracy: 94 },
    { date: "2024-04", predictions: 1890, accuracy: 94.5 },
    { date: "2024-05", predictions: 2100, accuracy: 95 },
    { date: "2024-06", predictions: 2340, accuracy: 94.8 },
  ];

  const modelUsage = [
    { name: "Anomaly Detection", value: 35, color: "#8b5cf6" },
    { name: "CPK Forecast", value: 25, color: "#3b82f6" },
    { name: "Defect Prediction", value: 20, color: "#10b981" },
    { name: "OEE Forecast", value: 15, color: "#f59e0b" },
    { name: "Others", value: 5, color: "#6b7280" },
  ];

  const recentAlerts = [
    { id: 1, type: "warning", message: "Model accuracy dropped below 90%", time: "2 hours ago", model: "Defect Prediction" },
    { id: 2, type: "info", message: "New training data available", time: "5 hours ago", model: "CPK Forecast" },
    { id: 3, type: "critical", message: "Drift detected in input features", time: "1 day ago", model: "Anomaly Detection" },
  ];

  const activeModels = [
    { name: "Anomaly Detection", status: "active", accuracy: 94.5, predictions: 1234 },
    { name: "CPK Forecast", status: "active", accuracy: 92.3, predictions: 987 },
    { name: "Defect Prediction", status: "active", accuracy: 91.8, predictions: 756 },
    { name: "OEE Forecast", status: "active", accuracy: 93.2, predictions: 654 },
    { name: "Yield Optimization", status: "training", accuracy: 0, predictions: 0 },
  ];

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
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Refreshing data..." })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
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
                <p className="text-2xl font-bold text-blue-600">94.2%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Predictions</p>
                <p className="text-2xl font-bold">12.5K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{kpi.value}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Target: {kpi.target}%</p>
                  </div>
                  {kpi.value >= kpi.target ? (
                    <ArrowUp className="h-8 w-8 text-green-500" />
                  ) : (
                    <ArrowDown className="h-8 w-8 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Prediction Trend
              </CardTitle>
              <CardDescription>Monthly predictions and accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={predictionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="predictions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Predictions" />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                Model Usage Distribution
              </CardTitle>
              <CardDescription>Prediction requests by model type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={modelUsage}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={100}
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
            </CardContent>
          </Card>
        </div>

        {/* Active Models & Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Models */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Active Models
              </CardTitle>
              <CardDescription>Currently deployed AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeModels.map((model) => (
                  <div key={model.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{model.name}</p>
                        {getStatusBadge(model.status)}
                      </div>
                      {model.status === "active" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Accuracy: {model.accuracy}% • Predictions: {model.predictions}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Recent Alerts
              </CardTitle>
              <CardDescription>Latest system notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.model} • {alert.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
