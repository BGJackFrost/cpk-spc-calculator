import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, TrendingUp, Activity, Brain, Target, Zap,
  AlertTriangle, CheckCircle, Calendar, Download, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function AiAnalyticsDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("30d");

  // Mock data
  const overallMetrics = [
    { name: "Total Predictions", value: "125.4K", change: "+12.5%", trend: "up" },
    { name: "Avg Accuracy", value: "93.8%", change: "+2.1%", trend: "up" },
    { name: "Active Models", value: "12", change: "+2", trend: "up" },
    { name: "Alerts Generated", value: "47", change: "-8", trend: "down" },
  ];

  const predictionTrend = [
    { month: "Jan", predictions: 8500, accuracy: 91.2 },
    { month: "Feb", predictions: 9200, accuracy: 92.1 },
    { month: "Mar", predictions: 10100, accuracy: 92.8 },
    { month: "Apr", predictions: 11500, accuracy: 93.2 },
    { month: "May", predictions: 12800, accuracy: 93.5 },
    { month: "Jun", predictions: 14200, accuracy: 93.8 },
  ];

  const modelPerformance = [
    { name: "Anomaly Detection", accuracy: 94.5, predictions: 35000, latency: 45 },
    { name: "CPK Forecast", accuracy: 92.3, predictions: 28000, latency: 78 },
    { name: "Defect Prediction", accuracy: 91.8, predictions: 22000, latency: 52 },
    { name: "OEE Forecast", accuracy: 93.2, predictions: 18000, latency: 120 },
    { name: "Yield Optimization", accuracy: 90.5, predictions: 15000, latency: 65 },
  ];

  const usageByType = [
    { name: "Anomaly Detection", value: 30, color: "#8b5cf6" },
    { name: "Forecasting", value: 25, color: "#3b82f6" },
    { name: "Classification", value: 20, color: "#10b981" },
    { name: "Optimization", value: 15, color: "#f59e0b" },
    { name: "Others", value: 10, color: "#6b7280" },
  ];

  const alertsByCategory = [
    { category: "Model Drift", count: 15, severity: "warning" },
    { category: "Low Accuracy", count: 12, severity: "critical" },
    { category: "High Latency", count: 8, severity: "warning" },
    { category: "Data Quality", count: 7, severity: "info" },
    { category: "Resource Usage", count: 5, severity: "warning" },
  ];

  const topFeatures = [
    { name: "Temperature", importance: 0.28, usage: 95 },
    { name: "Pressure", importance: 0.22, usage: 92 },
    { name: "Cycle Time", importance: 0.18, usage: 88 },
    { name: "Material Type", importance: 0.15, usage: 85 },
    { name: "Machine Age", importance: 0.12, usage: 78 },
  ];

  const recentInsights = [
    { id: 1, type: "trend", title: "CPK improvement trend detected", description: "Line 1 showing consistent improvement over 4 weeks", confidence: 92 },
    { id: 2, type: "anomaly", title: "Unusual pattern in defect rate", description: "Spike detected in evening shift", confidence: 87 },
    { id: 3, type: "prediction", title: "OEE forecast looks positive", description: "Expected 5% increase next week", confidence: 89 },
  ];

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
    );
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge className="bg-blue-500">Info</Badge>;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case "anomaly":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "prediction":
        return <Target className="h-5 w-5 text-green-500" />;
      default:
        return <Brain className="h-5 w-5 text-violet-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-violet-500" />
              AI Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive analytics and insights from AI/ML systems
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Refreshing data..." })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Exporting report..." })}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {overallMetrics.map((metric) => (
            <Card key={metric.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm ${metric.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Prediction Volume & Accuracy
              </CardTitle>
              <CardDescription>Monthly trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={predictionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
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
            </CardContent>
          </Card>

          {/* Usage by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-500" />
                Usage by Model Type
              </CardTitle>
              <CardDescription>Distribution of prediction requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={usageByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usageByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Model Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Model Performance Comparison
            </CardTitle>
            <CardDescription>Accuracy, usage, and latency metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="accuracy" fill="#10b981" name="Accuracy %" />
                <Bar yAxisId="right" dataKey="latency" fill="#3b82f6" name="Latency (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alerts & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Alerts by Category
              </CardTitle>
              <CardDescription>Alert distribution and severity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertsByCategory.map((alert) => (
                  <div key={alert.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{alert.category}</p>
                        <p className="text-sm text-muted-foreground">{alert.count} alerts</p>
                      </div>
                    </div>
                    {getSeverityBadge(alert.severity)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Top Features
              </CardTitle>
              <CardDescription>Most important features across models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topFeatures.map((feature) => (
                  <div key={feature.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{feature.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Importance: {feature.importance}</span>
                        <Badge variant="outline">{feature.usage}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-violet-500 h-2 rounded-full" 
                        style={{ width: `${feature.usage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-violet-500" />
              AI-Generated Insights
            </CardTitle>
            <CardDescription>Automated insights and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInsights.map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-4 border rounded-lg">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{insight.title}</p>
                      <Badge className="bg-violet-500">Confidence: {insight.confidence}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
