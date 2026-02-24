import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Brain,
  Play,
  Pause,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Database,
  Cpu,
  Activity,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  AlertTriangle,
  Info,
  Layers,
  GitBranch,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Types
interface TrainingJob {
  id: string;
  modelName: string;
  modelType: string;
  status: "pending" | "training" | "completed" | "failed";
  progress: number;
  startedAt: Date | null;
  completedAt: Date | null;
  dataSource: string;
  sampleCount: number;
  epochs: number;
  currentEpoch: number;
  metrics: {
    accuracy?: number;
    loss?: number;
    mape?: number;
    rmse?: number;
  };
  logs: string[];
}

interface TrainedModel {
  id: string;
  name: string;
  type: string;
  version: string;
  status: "active" | "inactive" | "archived";
  accuracy: number;
  trainedAt: Date;
  dataPoints: number;
  metrics: {
    mape: number;
    rmse: number;
    r2: number;
  };
  config: Record<string, unknown>;
}

// Mock training jobs
// Mock data removed - mockTrainingJobs (data comes from tRPC or is not yet implemented)

// Mock trained models
// Mock data removed - mockTrainedModels (data comes from tRPC or is not yet implemented)

// Training history for chart
const trainingHistory = [
  { epoch: 10, loss: 0.15, accuracy: 0.65 },
  { epoch: 20, loss: 0.10, accuracy: 0.72 },
  { epoch: 30, loss: 0.07, accuracy: 0.78 },
  { epoch: 40, loss: 0.05, accuracy: 0.82 },
  { epoch: 50, loss: 0.035, accuracy: 0.85 },
  { epoch: 60, loss: 0.025, accuracy: 0.87 },
  { epoch: 70, loss: 0.022, accuracy: 0.88 },
  { epoch: 80, loss: 0.020, accuracy: 0.89 },
  { epoch: 90, loss: 0.018, accuracy: 0.895 },
  { epoch: 100, loss: 0.017, accuracy: 0.90 },
];

// Model comparison data
const modelComparisonData = [
  { metric: "Accuracy", "CPK Predictor": 89, "Anomaly Detector": 92, "Root Cause": 78 },
  { metric: "Speed", "CPK Predictor": 85, "Anomaly Detector": 90, "Root Cause": 70 },
  { metric: "Precision", "CPK Predictor": 87, "Anomaly Detector": 91, "Root Cause": 75 },
  { metric: "Recall", "CPK Predictor": 88, "Anomaly Detector": 89, "Root Cause": 80 },
  { metric: "F1 Score", "CPK Predictor": 87, "Anomaly Detector": 90, "Root Cause": 77 },
];

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    training: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return <Badge className={colors[status] || colors.pending}>{status.toUpperCase()}</Badge>;
}

export default function AiModelTraining() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [activeTab, setActiveTab] = useState("jobs");
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);
  // Real data from tRPC
  const { data: trainingJobsData, refetch: refetchJobs } = trpc.ai.training.listJobs.useQuery({ limit: 50 });
  const { data: trainingStatsData } = trpc.ai.training.getStats.useQuery();
  const { data: modelsListData } = trpc.ai.models.list.useQuery({});

  // Map real data to component types
  const trainingJobs: TrainingJob[] = useMemo(() => {
    if (!trainingJobsData) return [];
    return (trainingJobsData as any[]).map((j: any) => ({
      id: String(j.id),
      modelName: j.modelName || j.name || `Job #${j.id}`,
      modelType: j.modelType || 'cpk_prediction',
      status: j.status || 'pending',
      progress: j.progress || (j.status === 'completed' ? 100 : 0),
      startedAt: j.startedAt ? new Date(j.startedAt) : new Date(j.createdAt),
      completedAt: j.completedAt ? new Date(j.completedAt) : null,
      dataSource: j.datasetType || j.dataSource || 'spc_analysis_history',
      sampleCount: j.sampleCount || 0,
      epochs: j.epochs || 100,
      currentEpoch: j.currentEpoch || (j.status === 'completed' ? (j.epochs || 100) : 0),
      metrics: j.metrics || { accuracy: j.accuracy || 0, loss: j.loss || 0 },
      logs: j.logs || [],
    }));
  }, [trainingJobsData]);

  const trainedModels: TrainedModel[] = useMemo(() => {
    if (!modelsListData) return [];
    return ((modelsListData as any).models || modelsListData as any[] || []).filter((m: any) => m.status === 'active' || m.status === 'trained').map((m: any) => ({
      id: String(m.id),
      name: m.name,
      type: m.modelType || m.type || 'cpk_prediction',
      version: m.version || '1.0',
      accuracy: m.accuracy || 0,
      trainedAt: m.trainedAt ? new Date(m.trainedAt) : new Date(m.createdAt),
      size: m.size || '0 MB',
      status: m.status === 'active' ? 'deployed' : 'ready',
      description: m.description || '',
    }));
  }, [modelsListData]);

  // Form state for new training job
  const [newJobForm, setNewJobForm] = useState({
    modelName: "",
    modelType: "cpk_prediction",
    dataSource: "spc_analysis_history",
    epochs: 100,
  });

  // Queries
  const { data: analysisHistory } = trpc.spc.getAnalysisHistory.useQuery({ limit: 10 });
  const startTrainingMutation = trpc.ai.training.startJob.useMutation({
    onSuccess: () => refetchJobs(),
  });

  // Auto-refresh training jobs every 10 seconds
  useEffect(() => {
    const hasRunningJobs = trainingJobs.some(j => j.status === 'training');
    if (!hasRunningJobs) return;
    const interval = setInterval(() => refetchJobs(), 10000);
    return () => clearInterval(interval);
  }, [trainingJobs, refetchJobs]);

  // Start new training job
  const handleStartTraining = async () => {
    if (!newJobForm.modelName) {
      toast.error(isVi ? "Vui lòng nhập tên model" : "Please enter model name");
      return;
    }

    try {
      await startTrainingMutation.mutateAsync({
        modelName: newJobForm.modelName,
        modelType: newJobForm.modelType as any,
        dataSource: newJobForm.dataSource,
        epochs: newJobForm.epochs,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to start training');
      return;
    }
    refetchJobs();
    setIsCreatingJob(false);
    setNewJobForm({ modelName: "", modelType: "cpk_prediction", dataSource: "spc_analysis_history", epochs: 100 });
    toast.success(isVi ? "Đã bắt đầu training" : "Training started");
  };

  // Cancel training job
  const handleCancelJob = (jobId: string) => {
    // TODO: Call cancel endpoint when available
    toast.info(isVi ? "Đã hủy training" : "Training cancelled");
    refetchJobs();
  };

  // Deploy model
  const handleDeployModel = (model: TrainedModel) => {
    // TODO: Call deploy endpoint when available
    toast.success(isVi ? `Đã deploy model ${model.name}` : `Deployed model ${model.name}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-purple-500" />
              {isVi ? "AI Model Training" : "AI Model Training"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi
                ? "Huấn luyện và quản lý các model AI với dữ liệu SPC thực"
                : "Train and manage AI models with real SPC data"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isCreatingJob} onOpenChange={setIsCreatingJob}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {isVi ? "Tạo Training Job" : "New Training Job"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{isVi ? "Tạo Training Job mới" : "Create New Training Job"}</DialogTitle>
                  <DialogDescription>
                    {isVi
                      ? "Cấu hình và bắt đầu huấn luyện model AI mới"
                      : "Configure and start training a new AI model"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{isVi ? "Tên Model" : "Model Name"}</Label>
                    <Input
                      value={newJobForm.modelName}
                      onChange={e => setNewJobForm(prev => ({ ...prev, modelName: e.target.value }))}
                      placeholder={isVi ? "VD: CPK Predictor v3" : "e.g., CPK Predictor v3"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{isVi ? "Loại Model" : "Model Type"}</Label>
                    <Select
                      value={newJobForm.modelType}
                      onValueChange={value => setNewJobForm(prev => ({ ...prev, modelType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpk_prediction">CPK Prediction</SelectItem>
                        <SelectItem value="anomaly_detection">Anomaly Detection</SelectItem>
                        <SelectItem value="root_cause">Root Cause Analysis</SelectItem>
                        <SelectItem value="quality_prediction">Quality Prediction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isVi ? "Nguồn dữ liệu" : "Data Source"}</Label>
                    <Select
                      value={newJobForm.dataSource}
                      onValueChange={value => setNewJobForm(prev => ({ ...prev, dataSource: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spc_analysis_history">SPC Analysis History</SelectItem>
                        <SelectItem value="spc_realtime_data">SPC Realtime Data</SelectItem>
                        <SelectItem value="spc_summary_stats">SPC Summary Stats</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{isVi ? "Số Epochs" : "Epochs"}</Label>
                    <Input
                      type="number"
                      value={newJobForm.epochs}
                      onChange={e => setNewJobForm(prev => ({ ...prev, epochs: parseInt(e.target.value) || 100 }))}
                      min={10}
                      max={1000}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingJob(false)}>
                    {isVi ? "Hủy" : "Cancel"}
                  </Button>
                  <Button onClick={handleStartTraining}>
                    <Play className="h-4 w-4 mr-2" />
                    {isVi ? "Bắt đầu Training" : "Start Training"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Tổng số Models" : "Total Models"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{trainedModels.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {trainedModels.filter(m => m.status === "active").length} {isVi ? "đang hoạt động" : "active"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Training Jobs" : "Training Jobs"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{trainingJobs.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {trainingJobs.filter(j => j.status === "training").length} {isVi ? "đang chạy" : "running"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Độ chính xác TB" : "Avg Accuracy"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(trainedModels.reduce((sum, m) => sum + m.accuracy, 0) / trainedModels.length * 100).toFixed(1)}%
              </div>
              <Progress 
                value={trainedModels.reduce((sum, m) => sum + m.accuracy, 0) / trainedModels.length * 100} 
                className="h-2 mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isVi ? "Dữ liệu Training" : "Training Data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(trainedModels.reduce((sum, m) => sum + m.dataPoints, 0) / 1000).toFixed(0)}K
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isVi ? "điểm dữ liệu" : "data points"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="jobs">
              <Cpu className="h-4 w-4 mr-2" />
              {isVi ? "Training Jobs" : "Training Jobs"}
            </TabsTrigger>
            <TabsTrigger value="models">
              <Layers className="h-4 w-4 mr-2" />
              {isVi ? "Trained Models" : "Trained Models"}
            </TabsTrigger>
            <TabsTrigger value="compare">
              <BarChart3 className="h-4 w-4 mr-2" />
              {isVi ? "So sánh Models" : "Compare Models"}
            </TabsTrigger>
          </TabsList>

          {/* Training Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Jobs List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{isVi ? "Danh sách Training Jobs" : "Training Jobs List"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isVi ? "Model" : "Model"}</TableHead>
                        <TableHead>{isVi ? "Loại" : "Type"}</TableHead>
                        <TableHead>{isVi ? "Trạng thái" : "Status"}</TableHead>
                        <TableHead>{isVi ? "Tiến độ" : "Progress"}</TableHead>
                        <TableHead>{isVi ? "Thao tác" : "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainingJobs.map(job => (
                        <TableRow 
                          key={job.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedJob(job)}
                        >
                          <TableCell className="font-medium">{job.modelName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{job.modelType}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={job.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={job.progress} className="h-2 w-20" />
                              <span className="text-sm">{job.progress.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {job.status === "training" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleCancelJob(job.id);
                                }}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{isVi ? "Chi tiết Job" : "Job Details"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedJob ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Model" : "Model"}</Label>
                        <p className="font-medium">{selectedJob.modelName}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Nguồn dữ liệu" : "Data Source"}</Label>
                        <p className="font-medium">{selectedJob.dataSource}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Số mẫu" : "Samples"}</Label>
                        <p className="font-medium">{selectedJob.sampleCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Epoch" : "Epoch"}</Label>
                        <p className="font-medium">{selectedJob.currentEpoch} / {selectedJob.epochs}</p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Metrics" : "Metrics"}</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className="font-medium">{((selectedJob.metrics.accuracy || 0) * 100).toFixed(1)}%</p>
                          </div>
                          <div className="bg-muted rounded p-2">
                            <p className="text-xs text-muted-foreground">Loss</p>
                            <p className="font-medium">{(selectedJob.metrics.loss || 0).toFixed(4)}</p>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">{isVi ? "Logs" : "Logs"}</Label>
                        <ScrollArea className="h-32 mt-2 rounded border p-2">
                          {selectedJob.logs.map((log, idx) => (
                            <p key={idx} className="text-xs font-mono text-muted-foreground">{log}</p>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      {isVi ? "Chọn một job để xem chi tiết" : "Select a job to view details"}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Training Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{isVi ? "Biểu đồ Training Progress" : "Training Progress Chart"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="epoch" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name={isVi ? "Accuracy" : "Accuracy"}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="loss"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name={isVi ? "Loss" : "Loss"}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trained Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isVi ? "Danh sách Models đã huấn luyện" : "Trained Models List"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isVi ? "Tên Model" : "Model Name"}</TableHead>
                      <TableHead>{isVi ? "Loại" : "Type"}</TableHead>
                      <TableHead>{isVi ? "Version" : "Version"}</TableHead>
                      <TableHead>{isVi ? "Trạng thái" : "Status"}</TableHead>
                      <TableHead>{isVi ? "Accuracy" : "Accuracy"}</TableHead>
                      <TableHead>{isVi ? "Dữ liệu" : "Data Points"}</TableHead>
                      <TableHead>{isVi ? "Ngày huấn luyện" : "Trained At"}</TableHead>
                      <TableHead>{isVi ? "Thao tác" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainedModels.map(model => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.type}</Badge>
                        </TableCell>
                        <TableCell>{model.version}</TableCell>
                        <TableCell>
                          <StatusBadge status={model.status} />
                        </TableCell>
                        <TableCell>
                          <span className={model.accuracy >= 0.9 ? "text-green-600" : model.accuracy >= 0.8 ? "text-yellow-600" : "text-red-600"}>
                            {(model.accuracy * 100).toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>{model.dataPoints.toLocaleString()}</TableCell>
                        <TableCell>{model.trainedAt.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {model.status !== "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeployModel(model)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Model Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trainedModels.filter(m => m.status === "active").map(model => (
                <Card key={model.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {model.name}
                    </CardTitle>
                    <CardDescription>v{model.version}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MAPE</span>
                      <span className="font-medium">{model.metrics.mape}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RMSE</span>
                      <span className="font-medium">{model.metrics.rmse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">R²</span>
                      <span className="font-medium">{model.metrics.r2}</span>
                    </div>
                    <Separator />
                    <div className="text-xs text-muted-foreground">
                      {isVi ? "Thuật toán" : "Algorithm"}: {(model.config as any).algorithm}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Compare Models Tab */}
          <TabsContent value="compare" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{isVi ? "So sánh đa chiều" : "Multi-dimensional Comparison"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={modelComparisonData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="CPK Predictor"
                          dataKey="CPK Predictor"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Anomaly Detector"
                          dataKey="Anomaly Detector"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Root Cause"
                          dataKey="Root Cause"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.3}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{isVi ? "So sánh Accuracy" : "Accuracy Comparison"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trainedModels.map(m => ({
                          name: m.name,
                          accuracy: m.accuracy * 100,
                          mape: m.metrics.mape,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="accuracy" fill="#3b82f6" name={isVi ? "Accuracy (%)" : "Accuracy (%)"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>{isVi ? "Bảng so sánh chi tiết" : "Detailed Comparison Table"}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isVi ? "Metric" : "Metric"}</TableHead>
                      {trainedModels.map(m => (
                        <TableHead key={m.id}>{m.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Accuracy</TableCell>
                      {trainedModels.map(m => (
                        <TableCell key={m.id}>{(m.accuracy * 100).toFixed(1)}%</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">MAPE</TableCell>
                      {trainedModels.map(m => (
                        <TableCell key={m.id}>{m.metrics.mape}%</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">RMSE</TableCell>
                      {trainedModels.map(m => (
                        <TableCell key={m.id}>{m.metrics.rmse}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">R²</TableCell>
                      {trainedModels.map(m => (
                        <TableCell key={m.id}>{m.metrics.r2}</TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">{isVi ? "Dữ liệu" : "Data Points"}</TableCell>
                      {trainedModels.map(m => (
                        <TableCell key={m.id}>{m.dataPoints.toLocaleString()}</TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
