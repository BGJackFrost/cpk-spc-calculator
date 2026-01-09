import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Camera, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  Edit, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Settings,
  History
} from "lucide-react";

export default function AutoCapture() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cameraUrl: "",
    cameraType: "ip_camera" as const,
    intervalSeconds: 60,
    scheduleType: "continuous" as const,
    startTime: "",
    endTime: "",
    enableAiAnalysis: true,
    analysisType: "quality_check" as const,
    qualityThreshold: 80,
    alertOnDefect: true,
    alertSeverityThreshold: "major" as const,
  });

  const utils = trpc.useUtils();
  const { data: schedules, isLoading } = trpc.autoCapture.list.useQuery();
  const { data: selectedStats } = trpc.autoCapture.getStats.useQuery(
    { scheduleId: selectedSchedule! },
    { enabled: !!selectedSchedule }
  );
  const { data: selectedHistory } = trpc.autoCapture.getHistory.useQuery(
    { scheduleId: selectedSchedule!, limit: 20 },
    { enabled: !!selectedSchedule }
  );

  const createMutation = trpc.autoCapture.create.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo lịch chụp tự động" });
      setIsCreateDialogOpen(false);
      utils.autoCapture.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = trpc.autoCapture.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const statusText = variables.status === "active" ? "kích hoạt" : variables.status === "paused" ? "tạm dừng" : "dừng";
      toast({ title: "Thành công", description: `Đã ${statusText} lịch chụp` });
      utils.autoCapture.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.autoCapture.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa lịch chụp" });
      utils.autoCapture.list.invalidate();
      setSelectedSchedule(null);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const triggerMutation = trpc.autoCapture.triggerCapture.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã kích hoạt chụp ảnh thủ công" });
      utils.autoCapture.getHistory.invalidate();
      utils.autoCapture.getStats.invalidate();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      cameraUrl: "",
      cameraType: "ip_camera",
      intervalSeconds: 60,
      scheduleType: "continuous",
      startTime: "",
      endTime: "",
      enableAiAnalysis: true,
      analysisType: "quality_check",
      qualityThreshold: 80,
      alertOnDefect: true,
      alertSeverityThreshold: "major",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><Play className="w-3 h-3 mr-1" /> Đang chạy</Badge>;
      case "paused":
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" /> Tạm dừng</Badge>;
      case "stopped":
        return <Badge variant="destructive"><Square className="w-3 h-3 mr-1" /> Đã dừng</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Nghiêm trọng</Badge>;
      case "major":
        return <Badge className="bg-orange-500">Lớn</Badge>;
      case "minor":
        return <Badge className="bg-yellow-500">Nhỏ</Badge>;
      default:
        return <Badge variant="outline">Không</Badge>;
    }
  };

  const getAnalysisStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "analyzing":
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6" />
              Auto-Capture
            </h1>
            <p className="text-muted-foreground">
              Quản lý lịch chụp ảnh tự động và phân tích chất lượng
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tạo lịch mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo lịch chụp tự động</DialogTitle>
                <DialogDescription>
                  Cấu hình camera và lịch chụp ảnh tự động
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên lịch</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Camera Line 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cameraType">Loại camera</Label>
                    <Select
                      value={formData.cameraType}
                      onValueChange={(value: "ip_camera" | "usb_camera" | "rtsp" | "http_snapshot") => 
                        setFormData({ ...formData, cameraType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip_camera">IP Camera</SelectItem>
                        <SelectItem value="usb_camera">USB Camera</SelectItem>
                        <SelectItem value="rtsp">RTSP Stream</SelectItem>
                        <SelectItem value="http_snapshot">HTTP Snapshot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cameraUrl">URL Camera</Label>
                  <Input
                    id="cameraUrl"
                    value={formData.cameraUrl}
                    onChange={(e) => setFormData({ ...formData, cameraUrl: e.target.value })}
                    placeholder="rtsp://192.168.1.100:554/stream"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả về lịch chụp này..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intervalSeconds">Khoảng cách chụp (giây)</Label>
                    <Input
                      id="intervalSeconds"
                      type="number"
                      min={10}
                      max={86400}
                      value={formData.intervalSeconds}
                      onChange={(e) => setFormData({ ...formData, intervalSeconds: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduleType">Loại lịch</Label>
                    <Select
                      value={formData.scheduleType}
                      onValueChange={(value: "continuous" | "time_range" | "cron") => 
                        setFormData({ ...formData, scheduleType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="continuous">Liên tục</SelectItem>
                        <SelectItem value="time_range">Theo giờ</SelectItem>
                        <SelectItem value="cron">Cron Expression</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.scheduleType === "time_range" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Giờ bắt đầu</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Giờ kết thúc</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Cấu hình phân tích AI</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="enableAiAnalysis">Bật phân tích AI</Label>
                      <Switch
                        id="enableAiAnalysis"
                        checked={formData.enableAiAnalysis}
                        onCheckedChange={(checked) => setFormData({ ...formData, enableAiAnalysis: checked })}
                      />
                    </div>

                    {formData.enableAiAnalysis && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="analysisType">Loại phân tích</Label>
                            <Select
                              value={formData.analysisType}
                              onValueChange={(value: "quality_check" | "defect_detection" | "measurement" | "all") => 
                                setFormData({ ...formData, analysisType: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="quality_check">Kiểm tra chất lượng</SelectItem>
                                <SelectItem value="defect_detection">Phát hiện lỗi</SelectItem>
                                <SelectItem value="measurement">Đo lường</SelectItem>
                                <SelectItem value="all">Tất cả</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="qualityThreshold">Ngưỡng chất lượng (%)</Label>
                            <Input
                              id="qualityThreshold"
                              type="number"
                              min={0}
                              max={100}
                              value={formData.qualityThreshold}
                              onChange={(e) => setFormData({ ...formData, qualityThreshold: parseInt(e.target.value) })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="alertOnDefect">Cảnh báo khi phát hiện lỗi</Label>
                          <Switch
                            id="alertOnDefect"
                            checked={formData.alertOnDefect}
                            onCheckedChange={(checked) => setFormData({ ...formData, alertOnDefect: checked })}
                          />
                        </div>

                        {formData.alertOnDefect && (
                          <div className="space-y-2">
                            <Label htmlFor="alertSeverityThreshold">Ngưỡng mức độ cảnh báo</Label>
                            <Select
                              value={formData.alertSeverityThreshold}
                              onValueChange={(value: "minor" | "major" | "critical") => 
                                setFormData({ ...formData, alertSeverityThreshold: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minor">Nhỏ (Minor)</SelectItem>
                                <SelectItem value="major">Lớn (Major)</SelectItem>
                                <SelectItem value="critical">Nghiêm trọng (Critical)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo lịch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danh sách lịch chụp</CardTitle>
                <CardDescription>
                  {schedules?.length || 0} lịch đã tạo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Đang tải...</div>
                ) : schedules?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có lịch chụp nào</p>
                    <p className="text-sm">Nhấn "Tạo lịch mới" để bắt đầu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules?.map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSchedule === schedule.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedSchedule(schedule.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium truncate">{schedule.name}</span>
                          {getStatusBadge(schedule.status || "stopped")}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Mỗi {schedule.intervalSeconds}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Schedule Details */}
          <div className="lg:col-span-2">
            {selectedSchedule ? (
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Tổng quan
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="w-4 h-4 mr-2" />
                    Lịch sử
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Cài đặt
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{selectedStats?.stats.totalCaptures || 0}</div>
                        <div className="text-sm text-muted-foreground">Tổng lần chụp</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedStats?.stats.completedCaptures || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Hoàn thành</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedStats?.stats.totalDefects || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Lỗi phát hiện</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {selectedStats?.stats.avgQualityScore?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Điểm chất lượng TB</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Điều khiển</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: selectedSchedule, status: "active" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Bắt đầu
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: selectedSchedule, status: "paused" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Tạm dừng
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: selectedSchedule, status: "stopped" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Dừng
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => triggerMutation.mutate({ scheduleId: selectedSchedule })}
                          disabled={triggerMutation.isPending}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Chụp ngay
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa lịch chụp này?")) {
                              deleteMutation.mutate({ id: selectedSchedule });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lịch sử chụp ảnh</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Điểm CL</TableHead>
                            <TableHead>Lỗi</TableHead>
                            <TableHead>Mức độ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedHistory?.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {new Date(item.capturedAt).toLocaleString("vi-VN")}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getAnalysisStatusIcon(item.analysisStatus || "pending")}
                                  <span className="capitalize">{item.analysisStatus}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.qualityScore ? `${item.qualityScore}%` : "-"}
                              </TableCell>
                              <TableCell>{item.defectsFound || 0}</TableCell>
                              <TableCell>{getSeverityBadge(item.severity || "none")}</TableCell>
                            </TableRow>
                          ))}
                          {(!selectedHistory?.items || selectedHistory.items.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Chưa có lịch sử chụp ảnh
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cài đặt lịch chụp</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Tính năng chỉnh sửa cài đặt sẽ được cập nhật trong phiên bản tiếp theo.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">Chọn một lịch chụp</h3>
                  <p className="text-muted-foreground">
                    Chọn một lịch chụp từ danh sách bên trái để xem chi tiết
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
