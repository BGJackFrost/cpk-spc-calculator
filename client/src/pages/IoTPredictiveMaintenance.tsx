/**
 * IoTPredictiveMaintenance - Dự đoán bảo trì thiết bị với AI
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LazyStreamdown as Streamdown } from "@/components/LazyStreamdown";
import { 
  Brain, AlertTriangle, Clock, CheckCircle, Activity, 
  TrendingDown, TrendingUp, Minus, RefreshCw, Play,
  Wrench, Cpu, Calendar, BarChart3, Zap, ThermometerSun,
  Gauge, Settings, FileText, ChevronRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Severity colors
const severityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const severityTextColors: Record<string, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-yellow-600",
  low: "text-green-600",
};

// Status colors
const statusColors: Record<string, string> = {
  active: "bg-blue-500",
  acknowledged: "bg-purple-500",
  resolved: "bg-green-500",
  dismissed: "bg-gray-500",
};

// Model type labels
const modelTypeLabels: Record<string, string> = {
  health_decay: "Suy giảm sức khỏe",
  failure_prediction: "Dự đoán hỏng hóc",
  anomaly_detection: "Phát hiện bất thường",
  remaining_life: "Tuổi thọ còn lại",
  maintenance_scheduling: "Lập lịch bảo trì",
};

// Algorithm labels
const algorithmLabels: Record<string, string> = {
  linear_regression: "Linear Regression",
  random_forest: "Random Forest",
  gradient_boosting: "Gradient Boosting",
  neural_network: "Neural Network",
  lstm: "LSTM",
  arima: "ARIMA",
  prophet: "Prophet",
};

export default function IoTPredictiveMaintenance() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form states
  const [modelForm, setModelForm] = useState({
    name: "",
    description: "",
    modelType: "health_decay" as const,
    algorithm: "linear_regression" as const,
    inputFeatures: ["health_score", "error_count", "temperature"],
    outputMetric: "days_until_maintenance",
    predictionHorizonDays: 30,
    confidenceThreshold: 0.7,
    alertThreshold: 0.8,
  });

  // Queries
  const { data: stats } = trpc.predictiveMaintenance.getStats.useQuery();
  const { data: models, refetch: refetchModels } = trpc.predictiveMaintenance.listModels.useQuery({});
  const { data: predictions, refetch: refetchPredictions } = trpc.predictiveMaintenance.listPredictions.useQuery({});
  const { data: urgentDevices } = trpc.predictiveMaintenance.getUrgentDevices.useQuery({ limit: 10 });
  const { data: predictionsSummary } = trpc.predictiveMaintenance.getPredictionsSummary.useQuery();
  const { data: devices } = trpc.iotDeviceManagement.listDevices.useQuery({});
  
  // Get selected prediction details
  const { data: predictionDetail } = trpc.predictiveMaintenance.getPrediction.useQuery(
    { id: selectedPrediction! },
    { enabled: !!selectedPrediction }
  );

  // Mutations
  const createModel = trpc.predictiveMaintenance.createModel.useMutation({
    onSuccess: () => {
      toast.success("Tạo model thành công");
      setShowCreateModel(false);
      refetchModels();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteModel = trpc.predictiveMaintenance.deleteModel.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa model");
      refetchModels();
    },
    onError: (err) => toast.error(err.message),
  });

  const runAnalysis = trpc.predictiveMaintenance.runAnalysis.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã phân tích ${data.devicesAnalyzed} thiết bị, tạo ${data.predictionsCreated} dự đoán`);
      refetchPredictions();
    },
    onError: (err) => toast.error(err.message),
  });

  const acknowledgePrediction = trpc.predictiveMaintenance.acknowledgePrediction.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận dự đoán");
      refetchPredictions();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolvePrediction = trpc.predictiveMaintenance.resolvePrediction.useMutation({
    onSuccess: () => {
      toast.success("Đã đánh dấu hoàn thành");
      refetchPredictions();
      setSelectedPrediction(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAIAnalysis = trpc.predictiveMaintenance.generateAIAnalysis.useMutation({
    onSuccess: (data) => {
      setAiAnalysis(data.llmAnalysis);
      setIsAnalyzing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsAnalyzing(false);
    },
  });

  const handleCreateModel = () => {
    if (!modelForm.name) {
      toast.error("Vui lòng nhập tên model");
      return;
    }
    createModel.mutate(modelForm);
  };

  const handleAnalyzeDevice = (deviceId: number) => {
    setSelectedDevice(deviceId);
    setAiAnalysis(null);
    setIsAnalyzing(true);
    generateAIAnalysis.mutate({ deviceId });
  };

  const getTrendIcon = (slope: number) => {
    if (slope > 0.01) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (slope < -0.01) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Predictive Maintenance
          </h1>
          <p className="text-muted-foreground">
            Dự đoán thời điểm bảo trì thiết bị với AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { refetchModels(); refetchPredictions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dự đoán hoạt động</p>
                <p className="text-2xl font-bold">{stats?.activePredictions || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nghiêm trọng</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalPredictions || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cao</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.highPredictions || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Thiết bị cần chú ý</p>
                <p className="text-2xl font-bold">{stats?.devicesAtRisk || 0}</p>
              </div>
              <Cpu className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Độ tin cậy TB</p>
                <p className="text-2xl font-bold">
                  {((stats?.averageConfidence || 0) * 100).toFixed(0)}%
                </p>
              </div>
              <Gauge className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="predictions">Dự đoán</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="analysis">Phân tích AI</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Thiết bị cần chú ý
                </CardTitle>
                <CardDescription>
                  Các thiết bị có nguy cơ cần bảo trì sớm
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentDevices?.map((pred) => (
                    <div
                      key={pred.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedPrediction(pred.id);
                        setActiveTab("predictions");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${severityColors[pred.severity || "low"]}`} />
                        <div>
                          <p className="font-medium">{pred.deviceCode || `Device #${pred.deviceId}`}</p>
                          <p className="text-xs text-muted-foreground">{pred.deviceName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={severityColors[pred.severity || "low"]}>
                          {pred.severity}
                        </Badge>
                        {pred.daysUntilMaintenance && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {pred.daysUntilMaintenance} ngày
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!urgentDevices || urgentDevices.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Không có thiết bị cần chú ý
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Predictions by Severity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Phân bố theo mức độ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        Nghiêm trọng
                      </span>
                      <span className="font-medium">{predictionsSummary?.critical?.length || 0}</span>
                    </div>
                    <Progress
                      value={
                        ((predictionsSummary?.critical?.length || 0) /
                          Math.max(stats?.activePredictions || 1, 1)) *
                        100
                      }
                      className="h-2 bg-red-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        Cao
                      </span>
                      <span className="font-medium">{predictionsSummary?.high?.length || 0}</span>
                    </div>
                    <Progress
                      value={
                        ((predictionsSummary?.high?.length || 0) /
                          Math.max(stats?.activePredictions || 1, 1)) *
                        100
                      }
                      className="h-2 bg-orange-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-yellow-500" />
                        Trung bình
                      </span>
                      <span className="font-medium">{predictionsSummary?.medium?.length || 0}</span>
                    </div>
                    <Progress
                      value={
                        ((predictionsSummary?.medium?.length || 0) /
                          Math.max(stats?.activePredictions || 1, 1)) *
                        100
                      }
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-500" />
                        Thấp
                      </span>
                      <span className="font-medium">{predictionsSummary?.low?.length || 0}</span>
                    </div>
                    <Progress
                      value={
                        ((predictionsSummary?.low?.length || 0) /
                          Math.max(stats?.activePredictions || 1, 1)) *
                        100
                      }
                      className="h-2 bg-green-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {models?.filter(m => m.isActive === 1).map((model) => (
                  <Button
                    key={model.id}
                    variant="outline"
                    onClick={() => runAnalysis.mutate({ modelId: model.id })}
                    disabled={runAnalysis.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Chạy {model.name}
                  </Button>
                ))}
                <Button onClick={() => setShowCreateModel(true)}>
                  <Brain className="h-4 w-4 mr-2" />
                  Tạo Model mới
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4">
            {predictions?.map((pred) => (
              <Card
                key={pred.id}
                className={`cursor-pointer transition-colors ${
                  selectedPrediction === pred.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedPrediction(pred.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${severityColors[pred.severity || "low"]} bg-opacity-20`}>
                        <Wrench className={`h-6 w-6 ${severityTextColors[pred.severity || "low"]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {pred.deviceCode || `Device #${pred.deviceId}`}
                          </h3>
                          <Badge className={severityColors[pred.severity || "low"]}>
                            {pred.severity}
                          </Badge>
                          <Badge className={statusColors[pred.status || "active"]}>
                            {pred.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pred.deviceName} • Model: {pred.modelName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Gauge className="h-4 w-4" />
                            Health: {parseFloat(pred.currentHealthScore || "100").toFixed(0)}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            Confidence: {(parseFloat(pred.confidenceScore || "0") * 100).toFixed(0)}%
                          </span>
                          {pred.daysUntilMaintenance && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {pred.daysUntilMaintenance} ngày
                            </span>
                          )}
                        </div>
                        {pred.contributingFactors && (pred.contributingFactors as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(pred.contributingFactors as string[]).map((factor, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pred.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgePrediction.mutate({ id: pred.id });
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Xác nhận
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyzeDevice(pred.deviceId);
                          setActiveTab("analysis");
                        }}
                      >
                        <Brain className="h-4 w-4 mr-1" />
                        AI
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!predictions || predictions.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có dự đoán nào</p>
                  <p className="text-sm mt-2">Chạy phân tích để tạo dự đoán bảo trì</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Prediction Detail Dialog */}
          {selectedPrediction && predictionDetail && (
            <Dialog open={!!selectedPrediction} onOpenChange={() => setSelectedPrediction(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Chi tiết dự đoán bảo trì</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Thiết bị</Label>
                      <p className="font-medium">
                        {predictionDetail.deviceCode} - {predictionDetail.deviceName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Model</Label>
                      <p className="font-medium">{predictionDetail.modelName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Mức độ</Label>
                      <Badge className={severityColors[predictionDetail.severity || "low"]}>
                        {predictionDetail.severity}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Trạng thái</Label>
                      <Badge className={statusColors[predictionDetail.status || "active"]}>
                        {predictionDetail.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Health Score hiện tại</Label>
                      <p className="font-medium">
                        {parseFloat(predictionDetail.currentHealthScore || "100").toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Độ tin cậy</Label>
                      <p className="font-medium">
                        {(parseFloat(predictionDetail.confidenceScore || "0") * 100).toFixed(1)}%
                      </p>
                    </div>
                    {predictionDetail.daysUntilMaintenance && (
                      <div>
                        <Label className="text-muted-foreground">Ngày dự kiến bảo trì</Label>
                        <p className="font-medium">{predictionDetail.daysUntilMaintenance} ngày</p>
                      </div>
                    )}
                    {predictionDetail.predictedDate && (
                      <div>
                        <Label className="text-muted-foreground">Ngày dự đoán</Label>
                        <p className="font-medium">
                          {new Date(predictionDetail.predictedDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    )}
                  </div>

                  {predictionDetail.llmAnalysis && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Phân tích AI</Label>
                      <div className="p-4 rounded-lg bg-muted prose prose-sm max-w-none">
                        <Streamdown>{predictionDetail.llmAnalysis}</Streamdown>
                      </div>
                    </div>
                  )}

                  {predictionDetail.recommendedActions && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Khuyến nghị</Label>
                      <ul className="list-disc list-inside space-y-1">
                        {(predictionDetail.recommendedActions as string[]).map((action, i) => (
                          <li key={i} className="text-sm">{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  {predictionDetail.status !== "resolved" && (
                    <Button
                      onClick={() =>
                        resolvePrediction.mutate({
                          id: predictionDetail.id,
                          outcome: "Đã thực hiện bảo trì",
                          wasAccurate: true,
                        })
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Đánh dấu hoàn thành
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateModel(true)}>
              <Brain className="h-4 w-4 mr-2" />
              Tạo Model
            </Button>
          </div>

          <div className="grid gap-4">
            {models?.map((model) => (
              <Card key={model.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        <Badge variant={model.isActive === 1 ? "default" : "secondary"}>
                          {model.isActive === 1 ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {modelTypeLabels[model.modelType]} • {algorithmLabels[model.algorithm || "linear_regression"]}
                      </p>
                      {model.description && (
                        <p className="text-sm mt-2">{model.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Horizon: {model.predictionHorizonDays} ngày</span>
                        <span>Confidence: {(parseFloat(model.confidenceThreshold || "0.7") * 100).toFixed(0)}%</span>
                        {model.lastTrainedAt && (
                          <span>
                            Trained: {new Date(model.lastTrainedAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => runAnalysis.mutate({ modelId: model.id })}
                        disabled={runAnalysis.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Chạy
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteModel.mutate({ id: model.id })}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!models || models.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có model nào</p>
                  <Button className="mt-4" onClick={() => setShowCreateModel(true)}>
                    Tạo Model đầu tiên
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Phân tích AI cho thiết bị
              </CardTitle>
              <CardDescription>
                Chọn thiết bị để nhận phân tích và khuyến nghị bảo trì từ AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Select
                  value={selectedDevice?.toString() || ""}
                  onValueChange={(v) => setSelectedDevice(parseInt(v))}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Chọn thiết bị" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices?.map((device) => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.deviceCode} - {device.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedDevice && handleAnalyzeDevice(selectedDevice)}
                  disabled={!selectedDevice || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Phân tích
                    </>
                  )}
                </Button>
              </div>

              {aiAnalysis && (
                <div className="p-6 rounded-lg bg-muted">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Kết quả phân tích AI
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{aiAnalysis}</Streamdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Model Dialog */}
      <Dialog open={showCreateModel} onOpenChange={setShowCreateModel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo Prediction Model</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Tên Model *</Label>
              <Input
                value={modelForm.name}
                onChange={(e) => setModelForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="VD: Health Decay Model"
              />
            </div>
            <div className="space-y-2">
              <Label>Loại Model</Label>
              <Select
                value={modelForm.modelType}
                onValueChange={(v: any) => setModelForm((prev) => ({ ...prev, modelType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health_decay">Suy giảm sức khỏe</SelectItem>
                  <SelectItem value="failure_prediction">Dự đoán hỏng hóc</SelectItem>
                  <SelectItem value="anomaly_detection">Phát hiện bất thường</SelectItem>
                  <SelectItem value="remaining_life">Tuổi thọ còn lại</SelectItem>
                  <SelectItem value="maintenance_scheduling">Lập lịch bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select
                value={modelForm.algorithm}
                onValueChange={(v: any) => setModelForm((prev) => ({ ...prev, algorithm: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear_regression">Linear Regression</SelectItem>
                  <SelectItem value="random_forest">Random Forest</SelectItem>
                  <SelectItem value="gradient_boosting">Gradient Boosting</SelectItem>
                  <SelectItem value="neural_network">Neural Network</SelectItem>
                  <SelectItem value="lstm">LSTM</SelectItem>
                  <SelectItem value="arima">ARIMA</SelectItem>
                  <SelectItem value="prophet">Prophet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prediction Horizon (ngày)</Label>
              <Input
                type="number"
                value={modelForm.predictionHorizonDays}
                onChange={(e) =>
                  setModelForm((prev) => ({
                    ...prev,
                    predictionHorizonDays: parseInt(e.target.value) || 30,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Confidence Threshold</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={modelForm.confidenceThreshold}
                onChange={(e) =>
                  setModelForm((prev) => ({
                    ...prev,
                    confidenceThreshold: parseFloat(e.target.value) || 0.7,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Alert Threshold</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={modelForm.alertThreshold}
                onChange={(e) =>
                  setModelForm((prev) => ({
                    ...prev,
                    alertThreshold: parseFloat(e.target.value) || 0.8,
                  }))
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={modelForm.description}
                onChange={(e) => setModelForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModel(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateModel} disabled={createModel.isPending}>
              {createModel.isPending ? "Đang tạo..." : "Tạo Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
