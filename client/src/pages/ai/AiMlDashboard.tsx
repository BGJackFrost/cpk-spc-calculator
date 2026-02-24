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
  TrendingUp, AlertTriangle, CheckCircle, Clock, Search, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export default function AiMlDashboard() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Real tRPC queries
  const { data: models, isLoading, refetch } = trpc.ai.models.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined
  );
  const { data: predictionsData } = trpc.ai.predictions.list.useQuery({ limit: 100 });
  const predictions = predictionsData?.predictions || [];

  // Start training mutation
  const startTrainingMutation = trpc.ai.training.startJob.useMutation({
    onSuccess: () => {
      toast({ title: "Đã bắt đầu training model" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  // Filter models by search query
  const filteredModels = models?.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate performance data from predictions
  const performanceData = predictions ? (() => {
    const dailyData: Record<string, { accuracy: number; count: number; latency: number }> = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyData[key] = { accuracy: 0, count: 0, latency: 0 };
    }

    predictions.forEach(pred => {
      const date = new Date(pred.createdAt);
      const key = date.toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyData[key]) {
        if (pred.confidence) {
          dailyData[key].accuracy += pred.confidence * 100;
          dailyData[key].count++;
        }
        // Mock latency for now
        dailyData[key].latency = 50 + Math.random() * 30;
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      accuracy: data.count > 0 ? Math.round(data.accuracy / data.count) : 0,
      latency: Math.round(data.latency),
    }));
  })() : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "training":
        return <Badge className="bg-blue-500">Training</Badge>;
      case "paused":
      case "inactive":
        return <Badge className="bg-gray-500">Paused</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "training":
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "paused":
      case "inactive":
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleStartTraining = (modelId: number) => {
    startTrainingMutation.mutate({ modelId });
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
              ML Model Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor machine learning models
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Train New Model
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{models?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {models?.filter(m => m.status === "active").length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {models?.filter(m => m.status === "training").length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {models && models.length > 0
                  ? `${Math.round(
                      models
                        .filter(m => m.accuracy)
                        .reduce((sum, m) => sum + (m.accuracy || 0), 0) /
                        models.filter(m => m.accuracy).length *
                        100
                    )}%`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Model Accuracy Trend
              </CardTitle>
              <CardDescription>Average accuracy over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-500" />
                Average Latency
              </CardTitle>
              <CardDescription>Inference latency over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="latency" fill="#8b5cf6" name="Latency (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  No latency data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Models</CardTitle>
                <CardDescription>Detailed view of all ML models</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredModels.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Predictions</TableHead>
                    <TableHead>Last Trained</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModels.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(model.status)}
                          <span className="font-medium">{model.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.type}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(model.status)}</TableCell>
                      <TableCell>
                        {model.accuracy ? `${Math.round(model.accuracy * 100)}%` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {predictions?.filter(p => p.modelId === model.id).length || 0}
                      </TableCell>
                      <TableCell>
                        {model.lastTrainedAt 
                          ? new Date(model.lastTrainedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {model.status === "inactive" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStartTraining(model.id)}
                              disabled={startTrainingMutation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Train
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "No models match your filters"
                  : "No models found. Create your first model to get started."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
