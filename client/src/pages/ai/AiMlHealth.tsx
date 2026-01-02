import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  Cpu, Database, Zap, Server, RefreshCw, TrendingUp, TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function AiMlHealth() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h");
  
  // Load health data from API
  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = trpc.ai.health.getSystemHealth.useQuery(undefined, {
    refetchInterval: 10000, // Auto-refresh every 10s
  });
  const { data: modelHealth, isLoading: modelHealthLoading } = trpc.ai.health.getModelHealth.useQuery({});
  const { data: resourceMetrics, isLoading: resourceLoading } = trpc.ai.health.getResourceMetrics.useQuery(undefined, {
    refetchInterval: 5000, // Auto-refresh every 5s
  });
  const { data: latencyMetrics } = trpc.ai.health.getLatencyMetrics.useQuery({
    hours: timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : 168,
  });

  if (healthLoading || modelHealthLoading || resourceLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Use real data from API
  const systemStatus = {
    overall: systemHealth?.status || "unknown",
    uptime: 99.8, // TODO: Calculate from uptime service
    lastCheck: systemHealth?.timestamp?.toISOString() || new Date().toISOString(),
    healthScore: systemHealth?.healthScore || 0,
  };

  const services = [
    { name: "Model Serving API", status: "healthy", uptime: 99.9, responseTime: 45, requests: 12450 },
    { name: "Training Pipeline", status: "healthy", uptime: 99.5, responseTime: 0, requests: 0 },
    { name: "Feature Store", status: "healthy", uptime: 99.8, responseTime: 12, requests: 45600 },
    { name: "Model Registry", status: "healthy", uptime: 99.7, responseTime: 8, requests: 3420 },
    { name: "Monitoring Service", status: "warning", uptime: 98.2, responseTime: 25, requests: 8900 },
  ];

  const resources = [
    { name: "CPU Usage", value: Math.round(resourceMetrics?.cpu?.usage || 0), threshold: 80, unit: "%" },
    { name: "Memory Usage", value: Math.round(resourceMetrics?.memory?.usage || 0), threshold: 85, unit: "%" },
    { name: "GPU Usage", value: Math.round(resourceMetrics?.gpu?.usage || 0), threshold: 90, unit: "%" },
    { name: "Disk Usage", value: Math.round(resourceMetrics?.disk?.usage || 0), threshold: 80, unit: "%" },
  ];

  const performanceMetrics = [
    { time: "00:00", cpu: 45, memory: 60, gpu: 30 },
    { time: "04:00", cpu: 40, memory: 58, gpu: 25 },
    { time: "08:00", cpu: 70, memory: 75, gpu: 55 },
    { time: "12:00", cpu: 85, memory: 82, gpu: 70 },
    { time: "16:00", cpu: 75, memory: 78, gpu: 60 },
    { time: "20:00", cpu: 60, memory: 70, gpu: 45 },
  ];

  const requestMetrics = [
    { time: "00:00", requests: 120, errors: 2, latency: 45 },
    { time: "04:00", requests: 80, errors: 1, latency: 42 },
    { time: "08:00", requests: 450, errors: 5, latency: 48 },
    { time: "12:00", requests: 680, errors: 8, latency: 52 },
    { time: "16:00", requests: 520, errors: 6, latency: 50 },
    { time: "20:00", requests: 340, errors: 4, latency: 46 },
  ];

  const recentIssues = [
    { id: 1, severity: "warning", service: "Monitoring Service", message: "High memory usage detected", time: "10 minutes ago" },
    { id: 2, severity: "info", service: "Model Serving API", message: "Latency spike resolved", time: "2 hours ago" },
    { id: 3, severity: "critical", service: "Feature Store", message: "Connection timeout (resolved)", time: "1 day ago" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500">Healthy</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Warning</Badge>;
      case "critical":
        return <Badge className="bg-red-500">Critical</Badge>;
      case "down":
        return <Badge className="bg-gray-500">Down</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getResourceColor = (value: number, threshold: number) => {
    if (value >= threshold) return "text-red-600";
    if (value >= threshold * 0.8) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8 text-green-500" />
              AI/ML Health Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor system health and performance metrics
            </p>
          </div>
          <Button onClick={() => toast({ title: "Refreshing health data..." })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(systemStatus.overall)}
                  System Status
                </CardTitle>
                <CardDescription>All AI/ML services operational</CardDescription>
              </div>
              {getStatusBadge(systemStatus.overall)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overall Uptime</p>
                <p className="text-2xl font-bold text-green-600">{systemStatus.uptime}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Services</p>
                <p className="text-2xl font-bold">{services.filter((s) => s.status === "healthy").length}/{services.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Check</p>
                <p className="text-sm font-medium">Just now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              Services Health
            </CardTitle>
            <CardDescription>Individual service status and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(service.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{service.name}</p>
                        {getStatusBadge(service.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Uptime: {service.uptime}%</span>
                        {service.responseTime > 0 && <span>Response: {service.responseTime}ms</span>}
                        {service.requests > 0 && <span>Requests: {service.requests.toLocaleString()}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-violet-500" />
              Resource Usage
            </CardTitle>
            <CardDescription>System resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resources.map((resource) => (
                <div key={resource.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{resource.name}</p>
                    <p className={`text-2xl font-bold ${getResourceColor(resource.value, resource.threshold)}`}>
                      {resource.value}{resource.unit}
                    </p>
                  </div>
                  <Progress value={resource.value} className="h-2" />
                  <p className="text-xs text-muted-foreground">Threshold: {resource.threshold}{resource.unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Resource Trends
              </CardTitle>
              <CardDescription>24-hour resource usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cpu" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="CPU %" />
                  <Area type="monotone" dataKey="memory" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="Memory %" />
                  <Area type="monotone" dataKey="gpu" stackId="3" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="GPU %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Request Metrics
              </CardTitle>
              <CardDescription>API requests and latency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={requestMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#3b82f6" name="Requests" />
                  <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#10b981" name="Latency (ms)" />
                  <Line yAxisId="left" type="monotone" dataKey="errors" stroke="#ef4444" name="Errors" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recent Issues
            </CardTitle>
            <CardDescription>Latest health alerts and incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{issue.service}</p>
                      <Badge variant="outline" className="text-xs">{issue.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{issue.message}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {issue.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
