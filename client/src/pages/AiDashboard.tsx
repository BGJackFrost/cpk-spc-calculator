import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Brain, TrendingUp, AlertTriangle, Plus, RefreshCw, Play, Target, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AiDashboard() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", type: "anomaly_detection" });
  
  const { data: stats, refetch: refetchStats } = trpc.ai.analytics.getDashboardStats.useQuery();
  const { data: models, refetch: refetchModels } = trpc.ai.models.list.useQuery();
  const { data: predictions } = trpc.ai.getPredictions.useQuery({ limit: 10 });
  
  const createModel = trpc.ai.models.create.useMutation({
    onSuccess: () => {
      toast.success("Model đã được tạo thành công");
      setIsAddDialogOpen(false);
      setNewModel({ name: "", type: "anomaly_detection" });
      refetchModels();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const startTraining = trpc.ai.training.startJob.useMutation({
    onSuccess: () => {
      toast.success("Đã bắt đầu training model");
      refetchModels();
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Active</Badge>;
      case "training": return <Badge className="bg-blue-500">Training</Badge>;
      case "inactive": return <Badge variant="secondary">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI/ML Dashboard</h1>
            <p className="text-muted-foreground mt-1">Quản lý models AI và dự đoán</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetchStats(); refetchModels(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Tạo Model</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo AI Model mới</DialogTitle>
                  <DialogDescription>Tạo model AI mới cho phân tích dữ liệu</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên Model</Label>
                    <Input value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} placeholder="CPK Anomaly Detector" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Loại Model</Label>
                    <Select value={newModel.type} onValueChange={(v) => setNewModel({ ...newModel, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anomaly_detection">Phát hiện bất thường</SelectItem>
                        <SelectItem value="cpk_prediction">Dự đoán CPK</SelectItem>
                        <SelectItem value="trend_analysis">Phân tích xu hướng</SelectItem>
                        <SelectItem value="quality_classification">Phân loại chất lượng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                  <Button onClick={() => createModel.mutate(newModel)} disabled={createModel.isPending}>
                    {createModel.isPending ? "Đang tạo..." : "Tạo Model"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng Models</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.totalModels || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-green-500" />Active</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{stats?.activeModels || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Play className="h-4 w-4 text-blue-500" />Training</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-500">{stats?.trainingModels || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Predictions</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.totalPredictions || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4" />Avg Accuracy</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{((stats?.avgAccuracy || 0) * 100).toFixed(1)}%</div></CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">AI Models</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="models">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models?.map((model) => (
                <Card key={model.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{model.name}</CardTitle>
                      {getStatusBadge(model.status)}
                    </div>
                    <CardDescription>{model.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                      <p>Accuracy: {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : "N/A"}</p>
                      <p>Last trained: {model.lastTrainedAt ? new Date(model.lastTrainedAt).toLocaleString("vi-VN") : "Chưa train"}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => startTraining.mutate({ modelId: model.id })}
                      disabled={model.status === "training" || startTraining.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {model.status === "training" ? "Đang training..." : "Start Training"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(!models || models.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Chưa có model nào. Nhấn "Tạo Model" để bắt đầu.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="predictions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Predictions</CardTitle>
              </CardHeader>
              <CardContent>
                {predictions && predictions.length > 0 ? (
                  <div className="space-y-2">
                    {predictions.map((pred) => (
                      <div key={pred.id} className="flex items-center justify-between p-3 bg-muted rounded">
                        <div>
                          <p className="font-medium">Model #{pred.modelId}</p>
                          <p className="text-sm text-muted-foreground">{new Date(pred.createdAt!).toLocaleString("vi-VN")}</p>
                        </div>
                        <Badge variant={pred.confidence && pred.confidence > 0.8 ? "default" : "secondary"}>
                          {pred.confidence ? `${(pred.confidence * 100).toFixed(0)}% confidence` : "N/A"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có predictions nào.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="anomalies">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Anomaly Detection
                </CardTitle>
                <CardDescription>Phát hiện bất thường trong dữ liệu SPC/CPK</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tính năng phát hiện bất thường đang được phát triển.</p>
                  <p className="text-sm">Hệ thống sẽ tự động phân tích dữ liệu và cảnh báo khi phát hiện anomaly.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
