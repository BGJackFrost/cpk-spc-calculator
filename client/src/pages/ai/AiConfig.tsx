import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw, Brain, Bell, Clock, Database, Shield, Zap, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AiConfig() {
  const { toast } = useToast();
  
  // Load config from API
  const { data: config, isLoading, refetch } = trpc.ai.settings.getConfig.useQuery();
  const updateConfigMutation = trpc.ai.settings.updateConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Đã lưu", description: "Cấu hình AI đã được lưu thành công" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
  
  // General settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [analysisInterval, setAnalysisInterval] = useState("15");
  const [confidenceThreshold, setConfidenceThreshold] = useState([0.8]);
  
  // Model settings (sync with API data)
  const [autoRetrain, setAutoRetrain] = useState(config?.autoRetrain ?? true);
  const [retrainInterval, setRetrainInterval] = useState(config?.retrainInterval?.toString() ?? "7");
  const [minAccuracyThreshold, setMinAccuracyThreshold] = useState([config?.minAccuracyThreshold ?? 0.85]);
  const [maxModelAge, setMaxModelAge] = useState(config?.maxModelAge?.toString() ?? "30");
  const [enableAutoDeployment, setEnableAutoDeployment] = useState(config?.enableAutoDeployment ?? false);
  const [enableMonitoring, setEnableMonitoring] = useState(config?.enableMonitoring ?? true);
  const [dataRetentionDays, setDataRetentionDays] = useState(config?.dataRetentionDays?.toString() ?? "90");
  const [maxConcurrentTraining, setMaxConcurrentTraining] = useState(config?.maxConcurrentTraining?.toString() ?? "3");
  
  // Notification settings
  const [notifyOnAnomaly, setNotifyOnAnomaly] = useState(true);
  const [notifyOnDrift, setNotifyOnDrift] = useState(true);
  const [notifyOnLowAccuracy, setNotifyOnLowAccuracy] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState("admin@example.com");
  
  // Performance settings
  const [batchSize, setBatchSize] = useState("32");
  const [gpuEnabled, setGpuEnabled] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);

  // Sync state with loaded config
  React.useEffect(() => {
    if (config) {
      setAutoRetrain(config.autoRetrain);
      setRetrainInterval(config.retrainInterval.toString());
      setMinAccuracyThreshold([config.minAccuracyThreshold]);
      setMaxModelAge(config.maxModelAge.toString());
      setEnableAutoDeployment(config.enableAutoDeployment);
      setEnableMonitoring(config.enableMonitoring);
      setDataRetentionDays(config.dataRetentionDays.toString());
      setMaxConcurrentTraining(config.maxConcurrentTraining.toString());
    }
  }, [config]);

  const handleSave = () => {
    updateConfigMutation.mutate({
      autoRetrain,
      retrainInterval: parseInt(retrainInterval),
      minAccuracyThreshold: minAccuracyThreshold[0],
      maxModelAge: parseInt(maxModelAge),
      enableAutoDeployment,
      enableMonitoring,
      dataRetentionDays: parseInt(dataRetentionDays),
      maxConcurrentTraining: parseInt(maxConcurrentTraining),
    });
  };

  const handleReset = () => {
    refetch();
    toast({ title: "Đã reset", description: "Cấu hình đã được khôi phục về mặc định" });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="w-8 h-8 text-gray-500" />
              AI Configuration
            </h1>
            <p className="text-muted-foreground mt-1">Cấu hình hệ thống AI/ML</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />Reset
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />Lưu cấu hình
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Tổng quan</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />Cài đặt chung
                </CardTitle>
                <CardDescription>Cấu hình cơ bản cho hệ thống AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bật AI Analysis</Label>
                    <p className="text-sm text-muted-foreground">Cho phép hệ thống AI phân tích dữ liệu</p>
                  </div>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Phân tích tự động</Label>
                    <p className="text-sm text-muted-foreground">Tự động chạy phân tích theo lịch</p>
                  </div>
                  <Switch checked={autoAnalysis} onCheckedChange={setAutoAnalysis} />
                </div>
                <div className="grid gap-2">
                  <Label>Khoảng thời gian phân tích (phút)</Label>
                  <Select value={analysisInterval} onValueChange={setAnalysisInterval}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 phút</SelectItem>
                      <SelectItem value="15">15 phút</SelectItem>
                      <SelectItem value="30">30 phút</SelectItem>
                      <SelectItem value="60">1 giờ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <Label>Ngưỡng độ tin cậy tối thiểu</Label>
                    <span className="text-sm font-medium">{(confidenceThreshold[0] * 100).toFixed(0)}%</span>
                  </div>
                  <Slider value={confidenceThreshold} onValueChange={setConfidenceThreshold} min={0.5} max={1} step={0.05} />
                  <p className="text-sm text-muted-foreground">Chỉ hiển thị kết quả có độ tin cậy trên ngưỡng này</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />Cài đặt Models
                </CardTitle>
                <CardDescription>Cấu hình cho các model AI/ML</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Model mặc định</Label>
                  <Select value={defaultModel} onValueChange={setDefaultModel}>
                    <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xgboost">XGBoost</SelectItem>
                      <SelectItem value="randomforest">Random Forest</SelectItem>
                      <SelectItem value="lstm">LSTM</SelectItem>
                      <SelectItem value="isolationforest">Isolation Forest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Tự động Retrain</Label>
                    <p className="text-sm text-muted-foreground">Tự động train lại model khi accuracy giảm</p>
                  </div>
                  <Switch checked={autoRetrain} onCheckedChange={setAutoRetrain} />
                </div>
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <Label>Ngưỡng Retrain (Accuracy)</Label>
                    <span className="text-sm font-medium">{(retrainThreshold[0] * 100).toFixed(0)}%</span>
                  </div>
                  <Slider value={retrainThreshold} onValueChange={setRetrainThreshold} min={0.7} max={0.95} step={0.05} />
                  <p className="text-sm text-muted-foreground">Retrain khi accuracy giảm xuống dưới ngưỡng này</p>
                </div>
                <div className="grid gap-2">
                  <Label>Số lượng model versions giữ lại</Label>
                  <Select value={maxModelsKept} onValueChange={setMaxModelsKept}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 versions</SelectItem>
                      <SelectItem value="5">5 versions</SelectItem>
                      <SelectItem value="10">10 versions</SelectItem>
                      <SelectItem value="20">20 versions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />Cài đặt thông báo
                </CardTitle>
                <CardDescription>Cấu hình cảnh báo và thông báo từ AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Thông báo khi phát hiện Anomaly</Label>
                    <p className="text-sm text-muted-foreground">Gửi cảnh báo khi AI phát hiện bất thường</p>
                  </div>
                  <Switch checked={notifyOnAnomaly} onCheckedChange={setNotifyOnAnomaly} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Thông báo khi Data Drift</Label>
                    <p className="text-sm text-muted-foreground">Cảnh báo khi phát hiện data drift</p>
                  </div>
                  <Switch checked={notifyOnDrift} onCheckedChange={setNotifyOnDrift} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Thông báo khi Accuracy thấp</Label>
                    <p className="text-sm text-muted-foreground">Cảnh báo khi model accuracy giảm</p>
                  </div>
                  <Switch checked={notifyOnLowAccuracy} onCheckedChange={setNotifyOnLowAccuracy} />
                </div>
                <div className="grid gap-2">
                  <Label>Email nhận thông báo</Label>
                  <Input value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} placeholder="admin@example.com" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />Cài đặt hiệu suất
                </CardTitle>
                <CardDescription>Tối ưu hiệu suất hệ thống AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Batch Size mặc định</Label>
                    <Select value={batchSize} onValueChange={setBatchSize}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">16</SelectItem>
                        <SelectItem value="32">32</SelectItem>
                        <SelectItem value="64">64</SelectItem>
                        <SelectItem value="128">128</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Số jobs đồng thời tối đa</Label>
                    <Select value={maxConcurrentJobs} onValueChange={setMaxConcurrentJobs}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 job</SelectItem>
                        <SelectItem value="2">2 jobs</SelectItem>
                        <SelectItem value="4">4 jobs</SelectItem>
                        <SelectItem value="8">8 jobs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Sử dụng GPU</Label>
                    <p className="text-sm text-muted-foreground">Tăng tốc training với GPU (nếu có)</p>
                  </div>
                  <Switch checked={gpuEnabled} onCheckedChange={setGpuEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Bật Cache</Label>
                    <p className="text-sm text-muted-foreground">Cache kết quả prediction để tăng tốc</p>
                  </div>
                  <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
                </div>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">Lưu ý về hiệu suất</p>
                        <p className="text-sm text-yellow-700">Tăng batch size và số jobs đồng thời có thể tăng tốc training nhưng cũng tăng sử dụng bộ nhớ. Hãy điều chỉnh phù hợp với cấu hình server.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
