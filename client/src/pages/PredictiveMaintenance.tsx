import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Activity, AlertTriangle, Brain, Cpu, Gauge, 
  TrendingUp, TrendingDown, Thermometer, Zap, 
  CheckCircle2, Clock, XCircle, RefreshCw, Eye
} from "lucide-react";

export default function PredictiveMaintenance() {
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>();

  // Queries
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: stats } = trpc.predictive.getStats.useQuery({ machineId: selectedMachineId });
  const { data: predictions, refetch: refetchPredictions } = trpc.predictive.listPredictions.useQuery({
    machineId: selectedMachineId,
    isAcknowledged: false,
    limit: 50,
  });
  const { data: sensors } = trpc.predictive.listSensors.useQuery({ machineId: selectedMachineId });
  const { data: sensorData } = trpc.predictive.listSensorData.useQuery({
    machineId: selectedMachineId,
    limit: 100,
  });
  const { data: models } = trpc.predictive.listModels.useQuery({});
  const { data: sensorTypes } = trpc.predictive.listSensorTypes.useQuery();
  const { data: machineHealth } = trpc.predictive.getMachineHealth.useQuery(
    { machineId: selectedMachineId! },
    { enabled: !!selectedMachineId }
  );
  const { data: failurePrediction } = trpc.predictive.predictFailure.useQuery(
    { machineId: selectedMachineId! },
    { enabled: !!selectedMachineId }
  );

  // Mutations
  const acknowledgeMutation = trpc.predictive.acknowledgePrediction.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchPredictions();
    },
    onError: (err) => toast.error(err.message),
  });

  const trainModelMutation = trpc.predictive.trainModel.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã huấn luyện model. Độ chính xác: ${(data.accuracy * 100).toFixed(1)}%`);
    },
    onError: (err) => toast.error(err.message),
  });

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Nghiêm trọng</Badge>;
      case "high": return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />Cao</Badge>;
      case "medium": return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Trung bình</Badge>;
      case "low": return <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Thấp</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high": return <Badge variant="destructive">Rủi ro cao</Badge>;
      case "medium": return <Badge className="bg-yellow-500">Rủi ro TB</Badge>;
      case "low": return <Badge className="bg-green-500">Rủi ro thấp</Badge>;
      default: return <Badge variant="outline">{risk}</Badge>;
    }
  };

  const getSensorIcon = (type: string | null) => {
    switch (type) {
      case "temperature": return <Thermometer className="w-4 h-4" />;
      case "vibration": return <Activity className="w-4 h-4" />;
      case "current":
      case "voltage": return <Zap className="w-4 h-4" />;
      case "pressure": return <Gauge className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "normal": return <Badge className="bg-green-500">Bình thường</Badge>;
      case "warning": return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      case "critical": return <Badge variant="destructive">Nguy hiểm</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bảo trì Dự đoán</h1>
            <p className="text-muted-foreground">Dự đoán hỏng hóc và tối ưu hóa bảo trì dựa trên dữ liệu sensor</p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={selectedMachineId?.toString() || "all"}
              onValueChange={(v) => setSelectedMachineId(v === "all" ? undefined : Number(v))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Chọn máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {machines?.map((m: { id: number; name: string }) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cảnh báo nghiêm trọng</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {(stats?.predictions as Record<string, number>)?.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">cần xử lý ngay</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cảnh báo cao</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {(stats?.predictions as Record<string, number>)?.high || 0}
              </div>
              <p className="text-xs text-muted-foreground">cần theo dõi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Models hoạt động</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.models?.active || 0}</div>
              <p className="text-xs text-muted-foreground">
                / {stats?.models?.total || 0} tổng models
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đọc nguy hiểm 24h</CardTitle>
              <Zap className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.criticalReadings24h || 0}</div>
              <p className="text-xs text-muted-foreground">lần vượt ngưỡng</p>
            </CardContent>
          </Card>
        </div>

        {/* Machine Health Overview */}
        {selectedMachineId && machineHealth && (
          <Card>
            <CardHeader>
              <CardTitle>Sức khỏe máy</CardTitle>
              <CardDescription>
                Đánh giá tổng quan tình trạng máy dựa trên dữ liệu sensor và dự đoán
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getHealthColor(machineHealth.healthScore)}`}>
                    {machineHealth.healthScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Điểm sức khỏe</p>
                  <Progress 
                    value={machineHealth.healthScore} 
                    className={`mt-2 h-2 ${getHealthBg(machineHealth.healthScore)}`}
                  />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{machineHealth.activePredictions}</div>
                  <p className="text-sm text-muted-foreground">Cảnh báo đang mở</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{machineHealth.warningRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ cảnh báo 24h</p>
                </div>
                <div className="text-center">
                  <Badge 
                    className={`text-lg px-4 py-2 ${
                      machineHealth.status === 'healthy' ? 'bg-green-500' :
                      machineHealth.status === 'warning' ? 'bg-yellow-500' :
                      machineHealth.status === 'degraded' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                  >
                    {machineHealth.status === 'healthy' ? 'Tốt' :
                     machineHealth.status === 'warning' ? 'Cảnh báo' :
                     machineHealth.status === 'degraded' ? 'Suy giảm' : 'Nguy hiểm'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">Trạng thái</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="predictions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="predictions">Dự đoán & Cảnh báo</TabsTrigger>
            <TabsTrigger value="sensors">Dữ liệu Sensor</TabsTrigger>
            <TabsTrigger value="failure">Dự báo hỏng hóc</TabsTrigger>
            <TabsTrigger value="models">Models AI</TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dự đoán & Cảnh báo</CardTitle>
                <CardDescription>Các cảnh báo từ hệ thống dự đoán AI</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Loại dự đoán</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Độ tin cậy</TableHead>
                      <TableHead>Dự kiến hỏng</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions?.map((pred) => (
                      <TableRow key={pred.id}>
                        <TableCell className="text-sm">
                          {pred.createdAt ? new Date(pred.createdAt).toLocaleString('vi-VN') : "-"}
                        </TableCell>
                        <TableCell className="font-medium">{pred.machineName}</TableCell>
                        <TableCell>{pred.modelName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pred.predictionType === "rul" ? "RUL" :
                             pred.predictionType === "failure_probability" ? "Xác suất hỏng" :
                             pred.predictionType === "anomaly_score" ? "Bất thường" : "Chỉ số sức khỏe"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSeverityBadge(pred.severity)}</TableCell>
                        <TableCell>
                          {pred.confidence ? `${(Number(pred.confidence) * 100).toFixed(0)}%` : "-"}
                        </TableCell>
                        <TableCell>
                          {pred.estimatedFailureDate 
                            ? new Date(pred.estimatedFailureDate).toLocaleDateString('vi-VN')
                            : pred.remainingUsefulLife 
                              ? `${pred.remainingUsefulLife}h còn lại`
                              : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeMutation.mutate({ id: pred.id })}
                            disabled={acknowledgeMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Xác nhận
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!predictions || predictions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                          Không có cảnh báo nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensors Tab */}
          <TabsContent value="sensors" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Sensor List */}
              <Card>
                <CardHeader>
                  <CardTitle>Danh sách Sensor</CardTitle>
                  <CardDescription>Các sensor đang hoạt động</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã sensor</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Máy</TableHead>
                        <TableHead>Vị trí</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sensors?.map((sensor) => (
                        <TableRow key={sensor.id}>
                          <TableCell className="font-mono">{sensor.sensorCode}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getSensorIcon(sensor.sensorTypeName)}
                              {sensor.sensorTypeName}
                            </div>
                          </TableCell>
                          <TableCell>{sensor.machineName}</TableCell>
                          <TableCell>{sensor.location || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {(!sensors || sensors.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            Chưa có sensor nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recent Readings */}
              <Card>
                <CardHeader>
                  <CardTitle>Dữ liệu gần đây</CardTitle>
                  <CardDescription>100 bản ghi mới nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Sensor</TableHead>
                        <TableHead>Giá trị</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sensorData?.slice(0, 20).map((data) => (
                        <TableRow key={data.id}>
                          <TableCell className="text-xs">
                            {data.recordedAt ? new Date(data.recordedAt).toLocaleTimeString('vi-VN') : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{data.sensorCode}</TableCell>
                          <TableCell className="font-bold">{Number(data.value).toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(data.status)}</TableCell>
                        </TableRow>
                      ))}
                      {(!sensorData || sensorData.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                            Chưa có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Failure Prediction Tab */}
          <TabsContent value="failure" className="space-y-4">
            {selectedMachineId && failurePrediction ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Dự báo hỏng hóc</CardTitle>
                      <CardDescription>Phân tích xu hướng sensor và dự đoán thời gian hỏng</CardDescription>
                    </div>
                    {getRiskBadge(failurePrediction.overallRisk)}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sensor</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Giá trị TB</TableHead>
                        <TableHead>Xu hướng</TableHead>
                        <TableHead>Dự kiến hỏng</TableHead>
                        <TableHead>Mức rủi ro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failurePrediction.predictions.map((pred, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{pred.sensorCode}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getSensorIcon(pred.sensorTypeName)}
                              {pred.sensorTypeName}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">
                            {pred.currentValue?.toFixed(2) || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {(pred.trend || 0) > 0 ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                              )}
                              <span className={(pred.trend || 0) > 0 ? "text-red-500" : "text-green-500"}>
                                {pred.trend?.toFixed(1) || 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pred.predictedDaysToFailure 
                              ? `${pred.predictedDaysToFailure} ngày`
                              : "Không xác định"}
                          </TableCell>
                          <TableCell>{getRiskBadge(pred.riskLevel)}</TableCell>
                        </TableRow>
                      ))}
                      {failurePrediction.predictions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Không đủ dữ liệu để dự đoán
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Vui lòng chọn một máy để xem dự báo hỏng hóc</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Models AI</CardTitle>
                <CardDescription>Các model dự đoán đã được huấn luyện</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Model</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Độ chính xác</TableHead>
                      <TableHead>Huấn luyện lần cuối</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models?.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.modelType === "rul" ? "RUL" :
                             model.modelType === "anomaly" ? "Phát hiện bất thường" :
                             model.modelType === "failure" ? "Dự đoán hỏng" : "Suy giảm"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{model.description || "-"}</TableCell>
                        <TableCell>
                          {model.accuracy ? (
                            <div className="flex items-center gap-2">
                              <Progress value={Number(model.accuracy) * 100} className="w-16 h-2" />
                              <span>{(Number(model.accuracy) * 100).toFixed(1)}%</span>
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {model.lastTrainedAt 
                            ? new Date(model.lastTrainedAt).toLocaleDateString('vi-VN')
                            : "Chưa huấn luyện"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={model.isActive ? "default" : "secondary"}>
                            {model.isActive ? "Hoạt động" : "Tắt"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => trainModelMutation.mutate({ id: model.id })}
                            disabled={trainModelMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Huấn luyện
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!models || models.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có model nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Sensor Types */}
            <Card>
              <CardHeader>
                <CardTitle>Loại Sensor</CardTitle>
                <CardDescription>Các loại sensor được hỗ trợ</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Ngưỡng cảnh báo</TableHead>
                      <TableHead>Ngưỡng nguy hiểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sensorTypes?.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-mono">{type.code}</TableCell>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.unit || "-"}</TableCell>
                        <TableCell>{type.minValue || "-"}</TableCell>
                        <TableCell>{type.maxValue || "-"}</TableCell>
                        <TableCell className="text-yellow-600">{type.warningThreshold || "-"}</TableCell>
                        <TableCell className="text-red-600">{type.criticalThreshold || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!sensorTypes || sensorTypes.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                          Chưa có loại sensor nào
                        </TableCell>
                      </TableRow>
                    )}
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
