import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Camera,
  Clock,
  Play,
  Pause,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Settings,
  History,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "CN" },
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
];

export default function CameraCaptureSchedule() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState("schedules");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cameraId: "",
    isEnabled: true,
    captureIntervalSeconds: 60,
    captureIntervalUnit: "minutes" as "seconds" | "minutes" | "hours",
    startTime: "08:00",
    endTime: "18:00",
    activeDays: [1, 2, 3, 4, 5] as number[],
    productionLineId: "",
    autoAnalyze: true,
    analysisType: "quality_inspection" as const,
    notifyOnNg: true,
    notifyOnWarning: false,
  });

  // Queries
  const { data: schedulesData, isLoading, refetch } = trpc.cameraCaptureSchedule.list.useQuery();
  const { data: cameras } = trpc.cameraConfig.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: logsData } = trpc.cameraCaptureSchedule.getLogs.useQuery({ limit: 50 });
  const { data: stats } = trpc.cameraCaptureSchedule.getStats.useQuery();

  // Mutations
  const createMutation = trpc.cameraCaptureSchedule.create.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo lịch chụp mới" });
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.cameraCaptureSchedule.update.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật lịch chụp" });
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.cameraCaptureSchedule.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa lịch chụp" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = trpc.cameraCaptureSchedule.toggle.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Thành công",
        description: data.isEnabled ? "Đã bật lịch chụp" : "Đã tắt lịch chụp",
      });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      cameraId: "",
      isEnabled: true,
      captureIntervalSeconds: 60,
      captureIntervalUnit: "minutes",
      startTime: "08:00",
      endTime: "18:00",
      activeDays: [1, 2, 3, 4, 5],
      productionLineId: "",
      autoAnalyze: true,
      analysisType: "quality_inspection",
      notifyOnNg: true,
      notifyOnWarning: false,
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || "",
      cameraId: String(schedule.cameraId),
      isEnabled: schedule.isEnabled,
      captureIntervalSeconds: schedule.captureIntervalSeconds,
      captureIntervalUnit: schedule.captureIntervalUnit,
      startTime: schedule.startTime || "08:00",
      endTime: schedule.endTime || "18:00",
      activeDays: schedule.activeDays || [1, 2, 3, 4, 5],
      productionLineId: schedule.productionLineId ? String(schedule.productionLineId) : "",
      autoAnalyze: schedule.autoAnalyze,
      analysisType: schedule.analysisType,
      notifyOnNg: schedule.notifyOnNg,
      notifyOnWarning: schedule.notifyOnWarning,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      cameraId: parseInt(formData.cameraId),
      isEnabled: formData.isEnabled,
      captureIntervalSeconds: formData.captureIntervalSeconds,
      captureIntervalUnit: formData.captureIntervalUnit,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      activeDays: formData.activeDays,
      productionLineId: formData.productionLineId ? parseInt(formData.productionLineId) : undefined,
      autoAnalyze: formData.autoAnalyze,
      analysisType: formData.analysisType,
      notifyOnNg: formData.notifyOnNg,
      notifyOnWarning: formData.notifyOnWarning,
    };

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day].sort(),
    }));
  };

  const schedules = schedulesData?.items || [];
  const logs = logsData?.items || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lịch Chụp Tự Động</h1>
            <p className="text-muted-foreground">
              Cấu hình auto-capture từ camera IP để tự động upload và phân tích ảnh
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo lịch mới
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng chụp</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Thành công</p>
                    <p className="text-2xl font-bold text-green-500">{stats.success}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Thất bại</p>
                    <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">OK</p>
                    <p className="text-2xl font-bold text-green-500">{stats.okCount}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10">OK</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">NG</p>
                    <p className="text-2xl font-bold text-red-500">{stats.ngCount}</p>
                  </div>
                  <Badge variant="outline" className="bg-red-500/10">NG</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Lịch chụp
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách lịch chụp ({schedules.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Camera className="h-12 w-12 mb-2" />
                    <p>Chưa có lịch chụp nào</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Camera</TableHead>
                        <TableHead>Tần suất</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Ngày hoạt động</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thống kê</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell>
                            {cameras?.find((c) => c.id === schedule.cameraId)?.name || `Camera #${schedule.cameraId}`}
                          </TableCell>
                          <TableCell>
                            {schedule.captureIntervalSeconds} {schedule.captureIntervalUnit}
                          </TableCell>
                          <TableCell>
                            {schedule.startTime || "00:00"} - {schedule.endTime || "23:59"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {DAYS_OF_WEEK.map((day) => (
                                <Badge
                                  key={day.value}
                                  variant={
                                    (schedule.activeDays as number[] || []).includes(day.value)
                                      ? "default"
                                      : "outline"
                                  }
                                  className="text-xs px-1"
                                >
                                  {day.label}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={schedule.isEnabled}
                              onCheckedChange={() => toggleMutation.mutate({ id: schedule.id })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <span className="text-green-500">{schedule.successCaptures}</span>
                              {" / "}
                              <span className="text-red-500">{schedule.failedCaptures}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(schedule)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa lịch chụp này?")) {
                                    deleteMutation.mutate({ id: schedule.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử chụp ({logs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <History className="h-12 w-12 mb-2" />
                    <p>Chưa có lịch sử chụp</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Camera</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Kết quả phân tích</TableHead>
                        <TableHead>Điểm chất lượng</TableHead>
                        <TableHead>Serial Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {log.createdAt && new Date(log.createdAt).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell>Camera #{log.cameraId}</TableCell>
                          <TableCell>
                            <Badge
                              variant={log.status === "success" ? "default" : "destructive"}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.analysisResult && (
                              <Badge
                                variant={
                                  log.analysisResult === "ok"
                                    ? "default"
                                    : log.analysisResult === "ng"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {log.analysisResult.toUpperCase()}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.qualityScore ? `${parseFloat(log.qualityScore).toFixed(1)}%` : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.serialNumber || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? "Chỉnh sửa lịch chụp" : "Tạo lịch chụp mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Tên lịch chụp *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Chụp dây chuyền 1 mỗi phút"
                />
              </div>

              <div className="col-span-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về lịch chụp..."
                />
              </div>

              <div>
                <Label>Camera *</Label>
                <Select
                  value={formData.cameraId}
                  onValueChange={(v) => setFormData({ ...formData, cameraId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras?.map((camera) => (
                      <SelectItem key={camera.id} value={String(camera.id)}>
                        {camera.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dây chuyền</Label>
                <Select
                  value={formData.productionLineId}
                  onValueChange={(v) => setFormData({ ...formData, productionLineId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Không chọn</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tần suất chụp</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={formData.captureIntervalSeconds}
                    onChange={(e) =>
                      setFormData({ ...formData, captureIntervalSeconds: parseInt(e.target.value) || 1 })
                    }
                    className="w-24"
                  />
                  <Select
                    value={formData.captureIntervalUnit}
                    onValueChange={(v: any) => setFormData({ ...formData, captureIntervalUnit: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Giây</SelectItem>
                      <SelectItem value="minutes">Phút</SelectItem>
                      <SelectItem value="hours">Giờ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Loại phân tích</Label>
                <Select
                  value={formData.analysisType}
                  onValueChange={(v: any) => setFormData({ ...formData, analysisType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defect_detection">Phát hiện lỗi</SelectItem>
                    <SelectItem value="quality_inspection">Kiểm tra chất lượng</SelectItem>
                    <SelectItem value="measurement">Đo lường</SelectItem>
                    <SelectItem value="ocr">OCR</SelectItem>
                    <SelectItem value="custom">Tùy chỉnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Thời gian bắt đầu</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>

              <div>
                <Label>Thời gian kết thúc</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Ngày hoạt động</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.activeDays.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tự động phân tích sau khi chụp</Label>
                  <Switch
                    checked={formData.autoAnalyze}
                    onCheckedChange={(v) => setFormData({ ...formData, autoAnalyze: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Thông báo khi phát hiện NG</Label>
                  <Switch
                    checked={formData.notifyOnNg}
                    onCheckedChange={(v) => setFormData({ ...formData, notifyOnNg: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Thông báo khi có Warning</Label>
                  <Switch
                    checked={formData.notifyOnWarning}
                    onCheckedChange={(v) => setFormData({ ...formData, notifyOnWarning: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Kích hoạt lịch chụp</Label>
                  <Switch
                    checked={formData.isEnabled}
                    onCheckedChange={(v) => setFormData({ ...formData, isEnabled: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.cameraId || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSchedule ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
