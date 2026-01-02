import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, Brain, Play, Pause, RefreshCw, Settings, 
  TrendingUp, AlertTriangle, CheckCircle, Clock, Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function AiMlDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data
  const models = [
    {
      id: 1,
      name: "Anomaly Detection v2.1",
      type: "Classification",
      status: "active",
      accuracy: 94.5,
      precision: 92.3,
      recall: 93.1,
      f1Score: 92.7,
      predictions: 12450,
      avgLatency: 45,
      lastTrained: "2024-06-15",
      version: "2.1.0",
    },
    {
      id: 2,
      name: "CPK Forecast LSTM",
      type: "Regression",
      status: "active",
      accuracy: 91.2,
      precision: 89.5,
      recall: 90.8,
      f1Score: 90.1,
      predictions: 8930,
      avgLatency: 78,
      lastTrained: "2024-06-10",
      version: "1.5.2",
    },
    {
      id: 3,
      name: "Defect Prediction RF",
      type: "Classification",
      status: "training",
      accuracy: 88.7,
      precision: 87.2,
      recall: 89.3,
      f1Score: 88.2,
      predictions: 0,
      avgLatency: 0,
      lastTrained: "2024-06-01",
      version: "3.0.0-beta",
    },
    {
      id: 4,
      name: "OEE Forecast Prophet",
      type: "Time Series",
      status: "active",
      accuracy: 93.8,
      precision: 91.9,
      recall: 92.5,
      f1Score: 92.2,
      predictions: 6720,
      avgLatency: 120,
      lastTrained: "2024-06-12",
      version: "2.0.1",
    },
    {
      id: 5,
      name: "Yield Optimization XGBoost",
      type: "Regression",
      status: "paused",
      accuracy: 90.3,
      precision: 88.7,
      recall: 89.9,
      f1Score: 89.3,
      predictions: 4560,
      avgLatency: 62,
      lastTrained: "2024-05-28",
      version: "1.8.0",
    },
  ];

  const performanceData = [
    { date: "Mon", accuracy: 92, latency: 45 },
    { date: "Tue", accuracy: 93, latency: 48 },
    { date: "Wed", accuracy: 94, latency: 46 },
    { date: "Thu", accuracy: 93.5, latency: 47 },
    { date: "Fri", accuracy: 94.5, latency: 45 },
    { date: "Sat", accuracy: 94.2, latency: 44 },
    { date: "Sun", accuracy: 94.8, latency: 43 },
  ];

  const predictionVolume = [
    { hour: "00:00", volume: 120 },
    { hour: "04:00", volume: 80 },
    { hour: "08:00", volume: 450 },
    { hour: "12:00", volume: 680 },
    { hour: "16:00", volume: 520 },
    { hour: "20:00", volume: 340 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "training":
        return <Badge className="bg-blue-500">Training</Badge>;
      case "paused":
        return <Badge className="bg-gray-500">Paused</Badge>;
      case "error":
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "training":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case "paused":
        return <Pause className="h-4 w-4 text-gray-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const filteredModels = models.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || model.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-500" />
              AI/ML Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage machine learning models
            </p>
          </div>
          <Button onClick={() => toast({ title: "Refreshing models..." })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Models</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{models.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {models.filter((m) => m.status === "active").length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">92.1%</p>
              <p className="text-xs text-muted-foreground mt-1">+2.3% from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">32.7K</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">58ms</p>
              <p className="text-xs text-muted-foreground mt-1">-5ms from yesterday</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Model Performance
              </CardTitle>
              <CardDescription>Weekly accuracy and latency trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                  <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#3b82f6" name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Prediction Volume
              </CardTitle>
              <CardDescription>Hourly prediction requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={predictionVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="#8b5cf6" name="Predictions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Deployed Models</CardTitle>
                <CardDescription>Manage and monitor all ML models</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">F1 Score</TableHead>
                  <TableHead className="text-right">Predictions</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <p className="text-xs text-muted-foreground">v{model.version}</p>
                      </div>
                    </TableCell>
                    <TableCell>{model.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(model.status)}
                        {getStatusBadge(model.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{model.accuracy}%</TableCell>
                    <TableCell className="text-right">{model.f1Score}%</TableCell>
                    <TableCell className="text-right">{model.predictions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{model.avgLatency}ms</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        {model.status === "active" ? (
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
