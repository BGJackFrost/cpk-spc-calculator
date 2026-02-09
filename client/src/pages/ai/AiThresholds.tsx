import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Gauge, Save, RefreshCw, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Brain, TrendingUp, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Mock thresholds data
// Mock data removed - mockThresholdsData (data comes from tRPC or is not yet implemented)

export default function AiThresholds() {
  const { toast } = useToast();
  
  // Load thresholds from API
  const { data: thresholds, isLoading, refetch } = trpc.ai.settings.getThresholds.useQuery();
  const updateThresholdsMutation = trpc.ai.settings.updateThresholds.useMutation({
    onSuccess: () => {
      toast({ title: "Đã lưu", description: "Cấu hình ngưỡng đã được lưu thành công" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newThreshold, setNewThreshold] = useState({
    name: "",
    metric: "cpk",
    type: "warning",
    value: "",
    operator: "lt",
    autoAdjust: true,
  });

  // Local state for editing thresholds
  const [cpkWarning, setCpkWarning] = useState(thresholds?.cpk?.warning?.toString() ?? "1.33");
  const [cpkCritical, setCpkCritical] = useState(thresholds?.cpk?.critical?.toString() ?? "1.0");
  const [accuracyWarning, setAccuracyWarning] = useState(thresholds?.accuracy?.warning?.toString() ?? "0.9");
  const [accuracyCritical, setAccuracyCritical] = useState(thresholds?.accuracy?.critical?.toString() ?? "0.85");
  const [driftWarning, setDriftWarning] = useState(thresholds?.drift?.warning?.toString() ?? "0.1");
  const [driftCritical, setDriftCritical] = useState(thresholds?.drift?.critical?.toString() ?? "0.2");
  const [latencyWarning, setLatencyWarning] = useState(thresholds?.latency?.warning?.toString() ?? "100");
  const [latencyCritical, setLatencyCritical] = useState(thresholds?.latency?.critical?.toString() ?? "500");

  // Sync with loaded data
  React.useEffect(() => {
    if (thresholds) {
      setCpkWarning(thresholds.cpk.warning.toString());
      setCpkCritical(thresholds.cpk.critical.toString());
      setAccuracyWarning(thresholds.accuracy.warning.toString());
      setAccuracyCritical(thresholds.accuracy.critical.toString());
      setDriftWarning(thresholds.drift.warning.toString());
      setDriftCritical(thresholds.drift.critical.toString());
      setLatencyWarning(thresholds.latency.warning.toString());
      setLatencyCritical(thresholds.latency.critical.toString());
    }
  }, [thresholds]);

  const handleSave = () => {
    updateThresholdsMutation.mutate({
      cpk: {
        warning: parseFloat(cpkWarning),
        critical: parseFloat(cpkCritical),
      },
      accuracy: {
        warning: parseFloat(accuracyWarning),
        critical: parseFloat(accuracyCritical),
      },
      drift: {
        warning: parseFloat(driftWarning),
        critical: parseFloat(driftCritical),
      },
      latency: {
        warning: parseFloat(latencyWarning),
        critical: parseFloat(latencyCritical),
      },
    });
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

  const handleCreate = () => {
    toast({ title: "Đã tạo", description: "Ngưỡng mới đã được tạo" });
    setIsCreateOpen(false);
    setNewThreshold({ name: "", metric: "cpk", type: "warning", value: "", operator: "lt", autoAdjust: true });
  };

  const handleDelete = (id: number) => {
    toast({ title: "Đã xóa", description: "Ngưỡng đã được xóa" });
  };

  const handleApplySuggestion = (id: number) => {
    toast({ title: "Đã áp dụng", description: "Đã áp dụng đề xuất từ AI" });
  };

  const handleApplyAllSuggestions = () => {
    toast({ title: "Đã áp dụng tất cả", description: "Đã áp dụng tất cả đề xuất từ AI" });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "warning": return <Badge className="bg-yellow-500">Warning</Badge>;
      case "critical": return <Badge className="bg-red-500">Critical</Badge>;
      case "info": return <Badge className="bg-blue-500">Info</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getOperatorText = (op: string) => {
    switch (op) {
      case "lt": return "<";
      case "gt": return ">";
      case "lte": return "≤";
      case "gte": return "≥";
      case "eq": return "=";
      default: return op;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "cpk": return "CPK";
      case "oee": return "OEE";
      case "defect": return "Tỷ lệ lỗi";
      case "accuracy": return "Accuracy";
      case "drift": return "Data Drift";
      default: return metric;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gauge className="w-8 h-8 text-orange-500" />
              AI Thresholds
            </h1>
            <p className="text-muted-foreground mt-1">Cấu hình ngưỡng cảnh báo với AI tự động điều chỉnh</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleApplyAllSuggestions}>
              <Brain className="w-4 h-4 mr-2" />Áp dụng tất cả đề xuất AI
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Thêm ngưỡng</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm ngưỡng mới</DialogTitle>
                  <DialogDescription>Cấu hình ngưỡng cảnh báo mới</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên ngưỡng</Label>
                    <Input value={newThreshold.name} onChange={(e) => setNewThreshold({ ...newThreshold, name: e.target.value })} placeholder="CPK Warning Line 1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Metric</Label>
                      <Select value={newThreshold.metric} onValueChange={(v) => setNewThreshold({ ...newThreshold, metric: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpk">CPK</SelectItem>
                          <SelectItem value="oee">OEE</SelectItem>
                          <SelectItem value="defect">Tỷ lệ lỗi</SelectItem>
                          <SelectItem value="accuracy">Accuracy</SelectItem>
                          <SelectItem value="drift">Data Drift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Loại</Label>
                      <Select value={newThreshold.type} onValueChange={(v) => setNewThreshold({ ...newThreshold, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Toán tử</Label>
                      <Select value={newThreshold.operator} onValueChange={(v) => setNewThreshold({ ...newThreshold, operator: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lt">Nhỏ hơn (&lt;)</SelectItem>
                          <SelectItem value="gt">Lớn hơn (&gt;)</SelectItem>
                          <SelectItem value="lte">Nhỏ hơn hoặc bằng (≤)</SelectItem>
                          <SelectItem value="gte">Lớn hơn hoặc bằng (≥)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Giá trị</Label>
                      <Input type="number" value={newThreshold.value} onChange={(e) => setNewThreshold({ ...newThreshold, value: e.target.value })} placeholder="1.0" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI tự động điều chỉnh</Label>
                      <p className="text-sm text-muted-foreground">Cho phép AI tự động đề xuất điều chỉnh ngưỡng</p>
                    </div>
                    <Switch checked={newThreshold.autoAdjust} onCheckedChange={(v) => setNewThreshold({ ...newThreshold, autoAdjust: v })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreate}>Tạo ngưỡng</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Recommendations */}
        {mockThresholdsData.aiRecommendations.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5 text-orange-500" />AI Đề xuất điều chỉnh ngưỡng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockThresholdsData.aiRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rec.metric}</span>
                        <Badge variant="outline" className="text-xs">Độ tin cậy: {(rec.confidence * 100).toFixed(0)}%</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Hiện tại: {rec.current}</span>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-600">Đề xuất: {rec.suggested}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                    </div>
                    <Button size="sm" onClick={() => handleApplySuggestion(i)}>Áp dụng</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thresholds Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách ngưỡng cảnh báo</CardTitle>
            <CardDescription>Quản lý các ngưỡng cảnh báo cho hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên ngưỡng</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Điều kiện</TableHead>
                  <TableHead>AI tự động</TableHead>
                  <TableHead>Đề xuất AI</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockThresholdsData.thresholds.map((threshold) => (
                  <TableRow key={threshold.id}>
                    <TableCell className="font-medium">{threshold.name}</TableCell>
                    <TableCell>{getMetricLabel(threshold.metric)}</TableCell>
                    <TableCell>{getTypeBadge(threshold.type)}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded">
                        {getOperatorText(threshold.operator)} {threshold.value}
                      </code>
                    </TableCell>
                    <TableCell>
                      {threshold.autoAdjust ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {threshold.aiSuggestion ? (
                        <span className="text-blue-600 font-medium">{threshold.aiSuggestion}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{threshold.lastAdjusted}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {threshold.aiSuggestion && (
                          <Button size="sm" variant="ghost" onClick={() => handleApplySuggestion(threshold.id)}>
                            <Brain className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(threshold.id)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(threshold.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
